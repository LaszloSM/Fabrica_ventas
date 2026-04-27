// Reset all operational data in the Azure PostgreSQL DB.
// Users are preserved so auth still works.
// Usage: npx ts-node scripts/reset-azure-db.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('⚠️  Resetting ALL data in Azure DB...')
  console.log('   Users will be preserved for authentication.\n')

  const steps: [string, () => Promise<any>][] = [
    ['SequenceStep', () => prisma.sequenceStep.deleteMany()],
    ['Sequence', () => prisma.sequence.deleteMany()],
    ['TemplateSequenceStep', () => prisma.templateSequenceStep.deleteMany()],
    ['TemplateSequence', () => prisma.templateSequence.deleteMany()],
    ['Template', () => prisma.template.deleteMany()],
    ['Activity', () => prisma.activity.deleteMany()],
    ['SalesTrigger', () => prisma.salesTrigger.deleteMany()],
    ['Deal', () => prisma.deal.deleteMany()],
    ['Contact', () => prisma.contact.deleteMany()],
    ['Prospect', () => prisma.prospect.deleteMany()],
    ['Goal', () => prisma.goal.deleteMany()],
    ['Session', () => prisma.session.deleteMany()],
    ['Account (OAuth)', () => prisma.account.deleteMany()],
  ]

  for (const [name, fn] of steps) {
    try {
      const result = await fn()
      console.log(`  ✓ ${name}: ${result.count} records deleted`)
    } catch (err) {
      console.warn(`  ⚠ ${name}: skipped (${(err as Error).message})`)
    }
  }

  console.log('\n✅ Reset complete. Database is clean and ready.')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
