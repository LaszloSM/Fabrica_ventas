'use client'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { GoalWithProgress } from '@/types'

export function QuarterlyGrid({ goals }: { goals: GoalWithProgress[] }) {
  const quarters = [1, 2, 3, 4]
  const services = Array.from(new Set(goals.map(g => g.serviceType)))

  const getCellColor = (goal?: GoalWithProgress) => {
    if (!goal) return 'bg-gray-50'
    const percent = goal.targetUnits 
      ? (goal.currentUnits / goal.targetUnits) * 100 
      : (goal.targetValue ? (goal.currentValue / goal.targetValue) * 100 : 0)
    
    if (percent >= 80) return 'bg-green-100 text-green-700'
    if (percent >= 40) return 'bg-yellow-100 text-yellow-700'
    return 'bg-red-100 text-red-700'
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Servicio</TableHead>
            {quarters.map(q => <TableHead key={q} className="text-center">Q{q}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map(service => (
            <TableRow key={service}>
              <TableCell className="font-medium">{service.replace('_', ' ')}</TableCell>
              {quarters.map(q => {
                const goal = goals.find(g => g.serviceType === service && g.quarter === q)
                const percent = goal?.targetUnits 
                  ? (goal.currentUnits / goal.targetUnits) * 100 
                  : (goal?.targetValue ? (goal.currentValue / goal.targetValue) * 100 : 0)

                return (
                  <TableCell key={q} className={`text-center font-bold ${getCellColor(goal)}`}>
                    {goal ? `${Math.round(percent)}%` : '—'}
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
