import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN || 'coimpactob.com'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async signIn({ user }) {
      const email = user.email || ''
      if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
        return false
      }
      return true
    },
    async jwt({ token, user }) {
      // user only exists on first login — role cached in token until session expires
      // To change a user's role, they must logout and login again (MVP behavior)
      if (user?.email) {
        const role = await getOrCreateUserRole(user.email)
        token.role = role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || session.user.email || 'anonymous'
        session.user.role = (token.role as 'ADMIN' | 'SALES' | 'VIEWER') || 'SALES'
      }
      return session
    },
  },
})

async function getOrCreateUserRole(email: string): Promise<'ADMIN' | 'SALES' | 'VIEWER'> {
  try {
    const backendUrl = process.env.FASTAPI_BACKEND_URL || 'http://127.0.0.1:8000'
    const res = await fetch(
      `${backendUrl}/api/v1/users/role?email=${encodeURIComponent(email)}`,
      { method: 'POST', cache: 'no-store' }
    )
    if (res.ok) {
      const json = await res.json()
      return json.data?.role || 'SALES'
    }
  } catch {
    // If backend is unreachable, default to SALES
  }
  return 'SALES'
}
