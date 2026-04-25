# CRM Pro Max Overhaul Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform coimpactoB from a functional CRM into a premium, industry-leading SaaS product with world-class UX and rock-solid stability.

**Architecture:** Three-phase approach — (1) stabilize critical systems & fix bugs, (2) redesign all UI components with a premium design system, (3) optimize performance and ship. The frontend (Next.js) proxies to a FastAPI backend via `/api/*` routes. All changes preserve the existing TypeScript/React stack and maintain backward compatibility.

**Tech Stack:** Next.js 16.2, React 19, TypeScript 5, Tailwind CSS 4, Radix UI, dnd-kit, FastAPI backend, MongoDB database.

---

## PHASE 1: CRITICAL BUG FIXES & SYSTEM STABILITY

### Chunk 1: Fix Pipeline 500 Error & Implement Robust Error Handling

#### Task 1: Diagnose & Fix Pipeline 500 Error

**Files:**
- Modify: `backend/app/api/v1/endpoints/deals.py:80-140`
- Modify: `backend/app/services/deal_service.py`
- Test: Backend logs and manual API testing

The Pipeline loads deals via `fetch('/api/deals')`. The error "Error cargando deals: 500" suggests either:
1. A missing database connection or collection
2. An unhandled exception in the deals endpoint
3. Missing relations (prospects, contacts, team_members collections)

**Debug Steps:**

- [ ] **Step 1:** Check backend logs for exceptions
  - Run: `cat backend.err.log backend.log`
  - Look for: Stack traces around `/deals` endpoint

- [ ] **Step 2:** Verify MongoDB collections exist
  - Check if `deals`, `prospects`, `contacts`, `team_members`, `activities` collections are created
  - Modify `backend/app/database.py` to initialize collections on startup if they don't exist

- [ ] **Step 3:** Add try-catch wrapping in deals endpoint
  ```python
  # In backend/app/api/v1/endpoints/deals.py, line 80
  @router.get("")
  async def list_deals(...):
      try:
          deals, total = await service.list_deals(...)
          # ... enrichment logic ...
          return {"data": items, "total": total}
      except Exception as e:
          import logging
          logging.error(f"Error in list_deals: {str(e)}", exc_info=True)
          raise HTTPException(status_code=500, detail=f"Error loading deals: {str(e)}")
  ```

- [ ] **Step 4:** Test the endpoint manually
  - Run: `curl -H "x-user-id: test-user" http://127.0.0.1:8000/api/v1/deals`
  - Expected: 200 response with `{"data": [...], "total": N}`

- [ ] **Step 5:** Commit fix
  ```bash
  git add backend/app/api/v1/endpoints/deals.py backend/app/database.py
  git commit -m "fix: add error handling and collection initialization for deals endpoint"
  ```

---

#### Task 2: Replace Brute-Force Error Messages with Graceful Error UI

**Files:**
- Modify: `components/pipeline/KanbanBoard.tsx:119-128`
- Create: `components/ui/ErrorBoundary.tsx`
- Create: `components/ui/ErrorAlert.tsx`
- Modify: `components/ui/Toast.tsx` (for transient errors)

Currently, errors show as a large red box. We'll replace this with:
1. **Transient errors** (network, temporary failures) → Toast + retry button
2. **Persistent errors** (auth, data issues) → Graceful error card with actionable guidance

- [ ] **Step 1: Write ErrorAlert component**

```typescript
// components/ui/ErrorAlert.tsx
'use client'

interface ErrorAlertProps {
  title: string
  message: string
  icon?: React.ReactNode
  action?: {
    label: string
    onClick: () => void
  }
}

export function ErrorAlert({ title, message, icon, action }: ErrorAlertProps) {
  return (
    <div className="rounded-xl border border-red-500/20 bg-gradient-to-r from-red-500/5 to-transparent backdrop-blur-sm p-4">
      <div className="flex items-start gap-3">
        {icon && <div className="text-red-400 flex-shrink-0">{icon}</div>}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-red-400">{title}</h3>
          <p className="text-sm text-red-300/70 mt-1">{message}</p>
          {action && (
            <button
              onClick={action.onClick}
              className="mt-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm font-medium transition-colors"
            >
              {action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update KanbanBoard error state**

Replace the current error render (line 119-128) with:

```typescript
if (error) {
  const isNetworkError = error.includes('fetch') || error.includes('Connection')
  
  return (
    <ErrorAlert
      title={isNetworkError ? "Backend disconnected" : "Error loading pipeline"}
      message={
        isNetworkError
          ? "Check that the backend server is running on port 8000"
          : error
      }
      icon={isNetworkError ? <AlertTriangle /> : <AlertCircle />}
      action={{
        label: "Retry",
        onClick: () => window.location.reload()
      }}
    />
  )
}
```

- [ ] **Step 3: Add retry mechanism to data loading**

In the `useEffect` (line 41-63), add exponential backoff:

```typescript
const [retryCount, setRetryCount] = useState(0)
const MAX_RETRIES = 3

useEffect(() => {
  async function loadData() {
    try {
      setLoading(true)
      setError(null)
      const [dealsRes, teamRes] = await Promise.all([
        fetch('/api/deals'),
        fetch('/api/team')
      ])
      
      if (!dealsRes.ok) {
        if (dealsRes.status === 500 && retryCount < MAX_RETRIES) {
          // Retry after delay
          setTimeout(() => setRetryCount(r => r + 1), Math.pow(2, retryCount) * 1000)
          return
        }
        throw new Error(`Error: ${dealsRes.status}`)
      }
      
      if (!teamRes.ok) throw new Error(`Team error: ${teamRes.status}`)
      
      const dealsJson = await dealsRes.json()
      const teamJson = await teamRes.json()
      setDeals(dealsJson.data || [])
      setTeamMembers(teamJson.data || [])
      setRetryCount(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }
  
  loadData()
}, [retryCount])
```

- [ ] **Step 4: Test error handling**
  - Stop the backend server
  - Reload the Pipeline page
  - Expected: See graceful error with "Backend disconnected" message and retry button
  - Start backend, click retry → Should load successfully

- [ ] **Step 5: Commit**
```bash
git add components/ui/ErrorAlert.tsx components/pipeline/KanbanBoard.tsx
git commit -m "feat: replace brute-force error messages with graceful error UI and retry mechanism"
```

---

#### Task 3: Implement Onboarding Empty States Across All Views

**Files:**
- Create: `components/ui/EmptyState.tsx`
- Modify: `components/pipeline/KanbanBoard.tsx` (line ~131)
- Modify: `app/(app)/prospects/page.tsx`
- Modify: `app/(app)/activities/page.tsx`
- Modify: `app/(app)/sequences/page.tsx`
- Modify: `app/(app)/templates/page.tsx`

- [ ] **Step 1: Create EmptyState component**

```typescript
// components/ui/EmptyState.tsx
'use client'

import { LucideIcon } from 'lucide-react'
import { Button } from './button'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
      <div className="mb-4 p-4 rounded-full bg-white/5">
        <Icon className="w-8 h-8 text-white/40" />
      </div>
      <h2 className="text-lg font-semibold text-white mb-2">{title}</h2>
      <p className="text-sm text-white/50 max-w-sm mb-6">{description}</p>
      {action && (
        <Button 
          onClick={action.onClick}
          className="bg-[#f26522] hover:bg-[#f26522]/90 text-white"
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Update KanbanBoard to show empty state when no deals**

After line 131, before the search/filters section, add:

```typescript
if (!loading && !error && filteredDeals.length === 0) {
  return (
    <div className="space-y-4">
      <EmptyState
        icon={TrendingUp}
        title="No deals yet"
        description="Create your first deal to start building your sales pipeline"
        action={{
          label: "Create Deal",
          onClick: () => {/* TODO: Open deal creation modal */}
        }}
      />
    </div>
  )
}
```

- [ ] **Step 3: Apply same pattern to Prospects page**

In `app/(app)/prospects/page.tsx`, replace "No hay datos" with EmptyState component

- [ ] **Step 4: Apply to Activities, Sequences, Templates**

Repeat Step 3 for each page

- [ ] **Step 5: Test empty states**
  - Clear all deals from database (or filter to show 0)
  - Expected: See friendly empty state with icon and CTA button

- [ ] **Step 6: Commit**
```bash
git add components/ui/EmptyState.tsx app/(app)/**/page.tsx components/pipeline/KanbanBoard.tsx
git commit -m "feat: implement onboarding empty states with actionable CTAs"
```

---

### Chunk 2: Stabilize API Layer & Fix Data Loading

#### Task 4: Add Comprehensive Error Logging & Monitoring

**Files:**
- Modify: `lib/backend-api.ts`
- Create: `lib/api-errors.ts`
- Modify: `components/pipeline/KanbanBoard.tsx`

- [ ] **Step 1: Create error classification module**

```typescript
// lib/api-errors.ts
export interface ApiError {
  code: string
  message: string
  status: number
  isRetryable: boolean
}

export function classifyError(status: number, message: string): ApiError {
  const isNetworkError = status === 0 || !status
  
  if (status >= 500) {
    return {
      code: 'SERVER_ERROR',
      message: 'Backend server error. Please try again.',
      status,
      isRetryable: true
    }
  }
  
  if (status === 401) {
    return {
      code: 'UNAUTHORIZED',
      message: 'Your session expired. Please log in again.',
      status,
      isRetryable: false
    }
  }
  
  if (status === 404) {
    return {
      code: 'NOT_FOUND',
      message: 'Resource not found.',
      status,
      isRetryable: false
    }
  }
  
  if (isNetworkError) {
    return {
      code: 'NETWORK_ERROR',
      message: 'Network connection failed. Check your internet.',
      status: 0,
      isRetryable: true
    }
  }
  
  return {
    code: 'UNKNOWN_ERROR',
    message: message || 'An unexpected error occurred.',
    status,
    isRetryable: false
  }
}
```

- [ ] **Step 2: Enhance proxyToBackend with error logging**

Modify `lib/backend-api.ts`:

```typescript
export async function proxyToBackend(req: NextRequest, path: string) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
  }

  const method = req.method
  const query = req.nextUrl.search || ''
  const body = method === 'GET' || method === 'HEAD' ? undefined : await req.text()
  
  try {
    const response = await fetch(`${BACKEND_URL}${API_PREFIX}${path}${query}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': session.user?.id || '',
        'x-user-email': session.user?.email || '',
        'x-user-role': session.user?.role || '',
      },
      body,
      cache: 'no-store',
    })

    const text = await response.text()
    
    if (!response.ok && response.status >= 500) {
      console.error(`[API ${response.status}] ${method} ${path}`, text)
    }

    return new NextResponse(text, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
      },
    })
  } catch (error) {
    console.error(`[API Network Error] ${method} ${path}:`, error)
    return NextResponse.json(
      { data: null, error: 'Network error' },
      { status: 0 }
    )
  }
}
```

- [ ] **Step 3: Test error logging**
  - Stop backend, trigger an error
  - Check browser console and server logs
  - Expected: Error logged with method, path, and status

- [ ] **Step 4: Commit**
```bash
git add lib/api-errors.ts lib/backend-api.ts
git commit -m "feat: add comprehensive API error classification and logging"
```

---

## PHASE 2: "UI/UX PRO MAX" TOTAL REDESIGN

### Chunk 3: Implement Premium Design System

#### Task 5: Create Premium Color Palette & Update Design Tokens

**Files:**
- Modify: `app/globals.css`
- Modify: `tailwind.config.ts` (if it exists, or create it)

Current design: Dark mode with muddy tones. New design: Premium gradient-based palette with:
- **Primary:** Vibrant orange (`#f26522`) for CTAs and accents (already used, refined)
- **Secondary:** Deep blue (`#1e3a8a`) for secondary actions
- **Accent:** Emerald (`#10b981`) for positive/success states
- **Neutral:** Sophisticated grays using OKLch color space (already in place, enhance)
- **Dark backgrounds:** `#0f172a` (deeper than current `#1a1a2e`)

- [ ] **Step 1: Update color tokens in globals.css**

Replace the `:root` and `.dark` sections with refined palette:

```css
:root {
  /* Light mode - minimal changes */
  --background: oklch(0.98 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.58 0.22 18.91);  /* Vibrant orange #f26522 */
  --secondary: oklch(0.32 0.12 260);   /* Deep blue */
  --accent: oklch(0.65 0.16 142);      /* Emerald */
  --destructive: oklch(0.577 0.245 27.325);
}

.dark {
  /* Premium dark palette */
  --background: oklch(0.08 0 0);          /* #0f172a - very dark */
  --foreground: oklch(0.98 0 0);          /* Nearly white */
  --card: oklch(0.12 0 0);                /* #1a2841 - card background */
  --card-foreground: oklch(0.98 0 0);
  --primary: oklch(0.58 0.22 18.91);      /* #f26522 - vibrant orange */
  --primary-foreground: oklch(0.08 0 0);
  --secondary: oklch(0.50 0.18 260);      /* Lighter blue for dark mode */
  --secondary-foreground: oklch(0.98 0 0);
  --accent: oklch(0.70 0.16 142);         /* Brighter emerald */
  --muted: oklch(0.25 0 0);               /* Muted gray */
  --muted-foreground: oklch(0.70 0 0);    /* Soft gray text */
  --border: oklch(1 0 0 / 8%);            /* Very subtle borders */
  --input: oklch(1 0 0 / 10%);
  --ring: oklch(0.58 0.22 18.91);         /* Orange focus ring */
}
```

- [ ] **Step 2: Verify color contrast**
  - Use WebAIM contrast checker: Primary on background, foreground on background
  - Expected: All ratios > 4.5:1 (WCAG AA)

- [ ] **Step 3: Update utility classes for interactive elements**

Add to `@layer utilities` in globals.css:

```css
@layer utilities {
  .glass-effect {
    @apply backdrop-blur-sm bg-white/5 border border-white/10;
  }
  
  .elevated-card {
    @apply bg-card rounded-xl border border-white/10 shadow-lg;
  }
  
  .premium-button {
    @apply bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all;
  }
  
  .subtle-border {
    @apply border border-white/5;
  }
}
```

- [ ] **Step 4: Test colors across pages**
  - Navigate to Dashboard, Pipeline, Prospects
  - Expected: Consistent, premium appearance; good contrast everywhere

- [ ] **Step 5: Commit**
```bash
git add app/globals.css tailwind.config.ts
git commit -m "design: implement premium color palette with OKLch refinement"
```

---

#### Task 6: Implement Modern Typography Scale

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx` (font imports)

Create a professional, hierarchical typography system:

- [ ] **Step 1: Add font imports**

In `app/layout.tsx`, add modern fonts:

```typescript
import { Geist_Mono, Geist, JetBrains_Mono } from 'next/font/google'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap'
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap'
})
```

- [ ] **Step 2: Define typography scale in globals.css**

```css
@layer base {
  /* Display: Large headlines */
  .text-display-lg {
    @apply text-5xl font-bold leading-tight tracking-tight;
  }
  
  .text-display-md {
    @apply text-4xl font-bold leading-tight tracking-tight;
  }
  
  /* Heading: Section titles */
  .text-heading-lg {
    @apply text-2xl font-bold leading-snug;
  }
  
  .text-heading-md {
    @apply text-xl font-semibold leading-snug;
  }
  
  .text-heading-sm {
    @apply text-lg font-semibold;
  }
  
  /* Body: Content text */
  .text-body-lg {
    @apply text-base leading-relaxed;
  }
  
  .text-body-md {
    @apply text-sm leading-relaxed;
  }
  
  .text-body-sm {
    @apply text-xs leading-relaxed text-white/70;
  }
  
  /* Labels: Form labels, badges */
  .text-label-lg {
    @apply text-base font-semibold;
  }
  
  .text-label-md {
    @apply text-sm font-semibold;
  }
  
  .text-label-sm {
    @apply text-xs font-medium uppercase tracking-wider;
  }
  
  /* Monospace: Code, numbers */
  .text-mono {
    @apply font-mono text-sm;
  }
}
```

- [ ] **Step 3: Replace hardcoded text sizes**

In components, replace inline `text-*` classes with semantic scale:
- Replace `className="text-2xl font-bold"` → `className="text-heading-lg"`
- Replace `className="text-sm text-white/50"` → `className="text-body-sm"`

This is done component-by-component in Phase 2 tasks.

- [ ] **Step 4: Test typography**
  - Visit Dashboard to verify all text sizes are consistent and readable
  - Expected: Professional, hierarchy-driven typography

- [ ] **Step 5: Commit**
```bash
git add app/globals.css app/layout.tsx
git commit -m "design: implement professional typography scale with semantic classes"
```

---

### Chunk 4: Redesign Core Components (Buttons, Cards, Inputs)

#### Task 7: Refactor Button Component for Premium Style

**Files:**
- Modify: `components/ui/button.tsx`

The current button likely uses basic Radix UI styling. We'll enhance it with:
- Smooth transitions
- Multiple variants (primary, secondary, ghost, destructive)
- Proper disabled states
- Loading states

- [ ] **Step 1: Read current button component**

Check `components/ui/button.tsx` to understand current structure

- [ ] **Step 2: Enhance with variants and loading state**

```typescript
'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  {
    variants: {
      variant: {
        primary: 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl',
        secondary: 'bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-md hover:shadow-lg',
        outline: 'border border-white/20 hover:border-white/40 text-foreground hover:bg-white/5',
        ghost: 'hover:bg-white/10 text-foreground',
        destructive: 'bg-destructive hover:bg-destructive/90 text-white',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={buttonVariants({ variant, size, className })}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <span className="animate-spin">⟳</span>}
        {children}
      </Comp>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
```

- [ ] **Step 3: Update all button usage in codebase**

Search for `<button` and `<Button` to replace with new variants. Priority: KanbanBoard, Dashboard cards, Forms.

- [ ] **Step 4: Test button states**
  - Hover, click, disabled, loading states
  - Expected: Smooth transitions, proper visual feedback

- [ ] **Step 5: Commit**
```bash
git add components/ui/button.tsx
git commit -m "design: enhance button component with premium variants and states"
```

---

#### Task 8: Redesign Card Component with Elevation & Depth

**Files:**
- Modify: `components/ui/card.tsx`
- Modify: `components/dashboard/KpiCard.tsx`
- Modify: `components/dashboard/GoalProgressCard.tsx`

- [ ] **Step 1: Enhance base card with glass effect**

```typescript
// components/ui/card.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border border-white/10 bg-card/50 backdrop-blur-sm shadow-lg transition-all hover:shadow-xl hover:border-white/20",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-heading-md text-foreground", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-body-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
```

- [ ] **Step 2: Refactor KpiCard with new card styling**

Replace current KpiCard with:

```typescript
// components/dashboard/KpiCard.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  title: string
  value: string | number
  change?: number
  icon: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
}

export function KpiCard({ title, value, change, icon: Icon, trend = 'neutral' }: KpiCardProps) {
  const getTrendColor = () => {
    if (trend === 'up') return 'text-emerald-400'
    if (trend === 'down') return 'text-red-400'
    return 'text-white/40'
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-heading-sm">{title}</CardTitle>
        <Icon className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">{value}</div>
        {change !== undefined && (
          <p className={`text-body-sm mt-2 ${getTrendColor()}`}>
            {change > 0 ? '+' : ''}{change}% this month
          </p>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Apply same pattern to GoalProgressCard**

Refactor using Card components with proper hierarchy

- [ ] **Step 4: Test cards**
  - Visit Dashboard
  - Expected: Cards with subtle glass effect, proper shadows, clean hierarchy

- [ ] **Step 5: Commit**
```bash
git add components/ui/card.tsx components/dashboard/KpiCard.tsx components/dashboard/GoalProgressCard.tsx
git commit -m "design: implement premium card component with glass effect and elevation"
```

---

#### Task 9: Redesign Input & Form Components

**Files:**
- Modify: `components/ui/input.tsx`
- Modify: `components/ui/label.tsx`
- Modify: `components/ui/select.tsx` (or create if missing)

- [ ] **Step 1: Enhance input component**

```typescript
// components/ui/input.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex h-10 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-base text-foreground placeholder:text-white/30 transition-all focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    ref={ref}
    {...props}
  />
))
Input.displayName = "Input"

export { Input }
```

- [ ] **Step 2: Enhance label component**

```typescript
// components/ui/label.tsx
import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const labelVariants = cva(
  "text-label-md leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
)

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
```

- [ ] **Step 3: Test form inputs**
  - Create a form with inputs, labels, buttons
  - Test focus states, disabled states
  - Expected: Professional, cohesive form UX

- [ ] **Step 4: Commit**
```bash
git add components/ui/input.tsx components/ui/label.tsx
git commit -m "design: enhance form inputs with premium styling and states"
```

---

### Chunk 5: Redesign Dashboard & Pipeline Views

#### Task 10: Implement Premium Dashboard Layout

**Files:**
- Modify: `app/(app)/dashboard/page.tsx`
- Modify: `components/dashboard/FunnelChart.tsx`
- Modify: `components/dashboard/RecentActivity.tsx`
- Modify: `components/dashboard/UrgentActions.tsx`

- [ ] **Step 1: Refactor dashboard page layout**

```typescript
// app/(app)/dashboard/page.tsx (updated structure)
'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { FunnelChart } from '@/components/dashboard/FunnelChart'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { ErrorAlert } from '@/components/ui/ErrorAlert'

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/metrics')
      .then(r => {
        if (!r.ok) throw new Error(`Status ${r.status}`)
        return r.json()
      })
      .then(json => setMetrics(json.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (error) {
    return <ErrorAlert title="Dashboard Error" message={error} />
  }

  if (loading || !metrics) {
    return <div className="flex items-center justify-center min-h-[50vh]">Loading...</div>
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display-md text-foreground">Dashboard</h1>
          <p className="text-body-md text-muted-foreground mt-1">Welcome back! Here's your sales overview.</p>
        </div>
        <Button>Generate Report</Button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard
          title="Total Pipeline"
          value={`$${(metrics.totalPipeline / 1000000).toFixed(1)}M`}
          change={8}
          trend="up"
          icon={DollarSign}
        />
        <KpiCard
          title="Deals This Month"
          value={metrics.dealsThisMonth}
          change={12}
          trend="up"
          icon={TrendingUp}
        />
        <KpiCard
          title="Team Members"
          value={metrics.teamMembers}
          change={0}
          trend="neutral"
          icon={Users}
        />
        <KpiCard
          title="Win Rate"
          value={`${metrics.winRate}%`}
          change={5}
          trend="up"
          icon={Target}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sales Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <FunnelChart data={metrics.funnel} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quarterly Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Chart component */}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentActivity activities={metrics.recentActivity} />
        </div>
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-heading-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="ghost" className="w-full justify-start">Create Deal</Button>
              <Button variant="ghost" className="w-full justify-start">Add Contact</Button>
              <Button variant="ghost" className="w-full justify-start">Start Sequence</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Enhance FunnelChart component**

Add proper styling and labels

- [ ] **Step 3: Enhance RecentActivity component**

Format as a timeline with icons and proper hierarchy

- [ ] **Step 4: Test dashboard**
  - Visit dashboard
  - Expected: Modern, information-dense, visually appealing

- [ ] **Step 5: Commit**
```bash
git add app/(app)/dashboard/page.tsx components/dashboard/*.tsx
git commit -m "design: implement premium dashboard layout with KPI grid and charts"
```

---

#### Task 11: Enhance Kanban Pipeline with Premium Styling

**Files:**
- Modify: `components/pipeline/KanbanBoard.tsx`
- Modify: `components/pipeline/DealCard.tsx`

- [ ] **Step 1: Update deal column styling**

In KanbanBoard, enhance the stage columns:

```typescript
// Replace stage column render (around line 220)
<div key={key} className="flex-shrink-0 w-72">
  <div className="rounded-xl border border-white/10 bg-card/40 backdrop-blur-sm p-4 hover:bg-card/60 transition-all hover:border-white/20 hover:shadow-lg">
    {/* Column header with gradient */}
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div 
          className="h-3 w-3 rounded-full shadow-lg" 
          style={{ 
            backgroundColor: color,
            boxShadow: `0 0 12px ${color}` 
          }} 
        />
        <h3 className="text-heading-sm text-foreground">{label}</h3>
      </div>
      <Badge className="bg-white/10 text-white/60 border-0 text-label-sm">
        {count}
      </Badge>
    </div>

    {/* Cards container */}
    <SortableContext items={stageDeals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
      <div className="space-y-3 min-h-[100px]">
        {stageDeals.map((deal) => (
          <DealCard key={deal.id} deal={deal} onClick={() => setSelected(deal)} />
        ))}
      </div>
    </SortableContext>
  </div>
</div>
```

- [ ] **Step 2: Redesign DealCard component**

```typescript
// components/pipeline/DealCard.tsx
'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { DealWithRelations } from '@/types'

interface DealCardProps {
  deal: DealWithRelations
  onClick: () => void
}

export function DealCard({ deal, onClick }: DealCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing"
    >
      <Card 
        onClick={onClick}
        className="p-4 cursor-pointer transition-all hover:shadow-xl"
      >
        {/* Deal name */}
        <h4 className="text-label-md text-foreground font-semibold truncate mb-2">
          {deal.prospect?.name || 'Unnamed Deal'}
        </h4>

        {/* Contact info */}
        {deal.contact && (
          <p className="text-body-sm text-muted-foreground truncate mb-3">
            {deal.contact.name}
          </p>
        )}

        {/* Value and status */}
        <div className="flex items-center justify-between">
          <span className="text-label-lg font-bold text-primary">
            ${(deal.value / 1000000).toFixed(1)}M
          </span>
          {deal.assignedUser && (
            <Badge className="bg-primary/20 text-primary text-xs">
              {deal.assignedUser.name}
            </Badge>
          )}
        </div>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Test kanban**
  - Drag and drop cards
  - Expected: Smooth animations, premium appearance, proper shadows

- [ ] **Step 4: Commit**
```bash
git add components/pipeline/KanbanBoard.tsx components/pipeline/DealCard.tsx
git commit -m "design: enhance kanban pipeline with premium card styling and animations"
```

---

### Chunk 6: Polish & Micro-interactions

#### Task 12: Implement Smooth Transitions & Loading States

**Files:**
- Modify: `components/pipeline/KanbanBoard.tsx`
- Modify: `components/ui/button.tsx`
- Create: `lib/animations.ts`

- [ ] **Step 1: Create animation utilities**

```typescript
// lib/animations.ts
export const animations = {
  fadeIn: 'animate-in fade-in duration-300',
  slideIn: 'animate-in slide-in-from-bottom duration-300',
  popIn: 'animate-in zoom-in duration-200',
  pulse: 'animate-pulse',
}

export const transitions = {
  fast: 'transition-all duration-150',
  normal: 'transition-all duration-300',
  slow: 'transition-all duration-500',
}
```

- [ ] **Step 2: Add loading skeletons**

Create `components/ui/Skeleton.tsx`:

```typescript
import { cn } from "@/lib/utils"

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-white/10", className)}
      {...props}
    />
  )
}
```

- [ ] **Step 3: Replace loading state in KanbanBoard**

```typescript
if (loading) {
  return (
    <div className="space-y-4">
      {/* Skeleton search bar */}
      <Skeleton className="h-10 w-full rounded-lg" />
      
      {/* Skeleton columns */}
      <div className="flex gap-4 overflow-x-auto">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-72 space-y-3">
            <Skeleton className="h-12 rounded-lg" />
            {Array.from({ length: 3 }).map((_, j) => (
              <Skeleton key={j} className="h-24 rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Test loading states**
  - Add network throttling in DevTools
  - Expected: Smooth skeleton loading, transitions

- [ ] **Step 5: Commit**
```bash
git add lib/animations.ts components/ui/Skeleton.tsx components/pipeline/KanbanBoard.tsx
git commit -m "feat: implement smooth transitions and skeleton loading states"
```

---

## PHASE 3: TECHNICAL EXCELLENCE & QUALITY ASSURANCE

### Chunk 7: Performance & Accessibility

#### Task 13: Optimize Component Rendering & Data Fetching

**Files:**
- Modify: `components/pipeline/KanbanBoard.tsx`
- Modify: `app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Memoize filtered deals**

In KanbanBoard, the `filteredDeals` is already memoized with `useMemo`. Verify it's working:

```typescript
// Already in place - ensure dependencies are correct
const filteredDeals = useMemo(() => {
  return deals.filter((deal) => {
    // ... filter logic
  })
}, [deals, searchQuery, filterAssignedTo, filterTemperature])
```

- [ ] **Step 2: Add React.memo to deal cards**

Wrap DealCard with memo to prevent re-renders:

```typescript
export const DealCard = React.memo(function DealCard({ deal, onClick }: DealCardProps) {
  // ... component code
})
```

- [ ] **Step 3: Optimize API calls**

Ensure no duplicate fetches in useEffect by adding proper dependencies:

```typescript
useEffect(() => {
  // Load data
}, []) // Only run once on mount
```

- [ ] **Step 4: Test performance**
  - Use Chrome DevTools Performance tab
  - Expected: No layout shifts (CLS < 0.1), smooth 60fps interactions

- [ ] **Step 5: Commit**
```bash
git add components/pipeline/KanbanBoard.tsx components/pipeline/DealCard.tsx
git commit -m "perf: optimize component rendering and memoization"
```

---

#### Task 14: Verify Accessibility & Contrast

**Files:**
- Verify all components

- [ ] **Step 1: Run axe accessibility audit**

In browser DevTools (axe extension):
- Dashboard page
- Pipeline page
- Forms
- Expected: No critical or serious violations

- [ ] **Step 2: Test keyboard navigation**

- Tab through all interactive elements
- Expected: Visible focus indicators, proper tab order

- [ ] **Step 3: Test with screen reader**

- Use NVDA or JAWS
- Expected: All content readable, proper semantic HTML

- [ ] **Step 4: Verify color contrast**

For all text:
- Primary on dark background: 4.5:1 minimum
- Expected: All pass WCAG AA

- [ ] **Step 5: Document accessibility notes**

Create `docs/ACCESSIBILITY.md` with audit results

- [ ] **Step 6: Commit**
```bash
git add docs/ACCESSIBILITY.md
git commit -m "docs: add accessibility audit results"
```

---

### Chunk 8: Final QA & Deployment Readiness

#### Task 15: Full System Testing & Bug Fixes

**Files:**
- Various (as bugs are found)

**Testing Checklist:**

- [ ] **Pipeline Page**
  - [ ] Load deals successfully
  - [ ] Drag and drop works smoothly
  - [ ] Search/filter works
  - [ ] Error handling on backend down
  - [ ] Empty state appears when no deals

- [ ] **Dashboard Page**
  - [ ] Load metrics
  - [ ] Charts render correctly
  - [ ] KPI cards display properly
  - [ ] Responsive on mobile

- [ ] **Prospects Page**
  - [ ] List loads
  - [ ] Search works
  - [ ] Create form works
  - [ ] Empty state on no prospects

- [ ] **Form Submission**
  - [ ] Validation works
  - [ ] Loading state during submit
  - [ ] Success/error messages
  - [ ] Error states recover

- [ ] **Responsive Design**
  - [ ] Mobile (375px)
  - [ ] Tablet (768px)
  - [ ] Desktop (1440px)
  - [ ] No horizontal scroll

- [ ] **Performance**
  - [ ] Largest Contentful Paint < 2.5s
  - [ ] Cumulative Layout Shift < 0.1
  - [ ] First Input Delay < 100ms

- [ ] **Cross-browser**
  - [ ] Chrome/Edge
  - [ ] Firefox
  - [ ] Safari

---

#### Task 16: Create Component Storybook (Optional - for future maintenance)

**Files:**
- Create: `stories/Button.stories.tsx`
- Create: `stories/Card.stories.tsx`

This is optional but highly recommended for a premium product.

---

## SUMMARY OF DELIVERABLES

After completing all tasks:

✅ **Phase 1 Complete:**
- Pipeline 500 error diagnosed and fixed
- Graceful error handling with retry mechanism
- Actionable empty states across all views

✅ **Phase 2 Complete:**
- Premium color palette with OKLch refinement
- Professional typography scale
- Enhanced Button, Card, Input components
- Redesigned Dashboard with KPI grid
- Premium Kanban pipeline
- Smooth transitions and skeleton loading

✅ **Phase 3 Complete:**
- Performance optimized
- Accessibility verified
- Full QA testing passed
- Ready for production deployment

**Result:** A top-tier CRM that feels like Linear/Stripe-level premium product.

---

## EXECUTION NOTES

- **Commit Frequency:** Each task should result in 1-2 commits. Keep commits atomic and well-described.
- **Testing:** Test each component in isolation before integrating into pages.
- **Mobile First:** Design mobile, enhance for desktop.
- **Color Palette:** Use the primary orange (#f26522), secondary blue, and emerald green consistently.
- **Avoid Over-engineering:** Don't add features not in scope. Focus on the plan.
