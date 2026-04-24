'use client'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface LeaderboardEntry {
  name: string
  won: number
  pipeline: number
  deals: number
}

export function TeamLeaderboard({ data }: { data: LeaderboardEntry[] }) {
  const medals = ['🥇', '🥈', '🥉']

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Vendedor</TableHead>
          <TableHead className="text-right">Deals Activos</TableHead>
          <TableHead className="text-right">Pipeline ($)</TableHead>
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
            <TableCell className="text-right">{entry.deals ?? 0}</TableCell>
            <TableCell className="text-right">${(entry.pipeline ?? 0).toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
