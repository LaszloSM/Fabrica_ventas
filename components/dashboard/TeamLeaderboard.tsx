'use client'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface LeaderboardEntry {
  name: string
  wonCount: number
  wonValue: number
}

export function TeamLeaderboard({ data }: { data: LeaderboardEntry[] }) {
  const medals = ['🥇', '🥈', '🥉']

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Vendedor</TableHead>
          <TableHead className="text-right">Deals Ganados</TableHead>
          <TableHead className="text-right">Valor Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((entry, i) => (
          <TableRow key={entry.name}>
            <TableCell className="font-medium">
              <div className="flex items-center gap-2">
                {medals[i] && <span>{medals[i]}</span>}
                {entry.name}
              </div>
            </TableCell>
            <TableCell className="text-right">{entry.wonCount}</TableCell>
            <TableCell className="text-right">${entry.wonValue.toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
