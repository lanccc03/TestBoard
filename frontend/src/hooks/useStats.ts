import { useQuery } from '@tanstack/react-query'

import {
  getStatsByCase,
  getStatsByDate,
  getStatsByOwner,
  getStatsByRunner,
  type StatsQuery,
} from '@/api/stats'

export function useStats(query: StatsQuery) {
  const byDate = useQuery({
    queryKey: ['stats', 'by-date', query.startedAtFrom, query.startedAtTo],
    queryFn: () => getStatsByDate(query),
  })
  const byOwner = useQuery({
    queryKey: [
      'stats',
      'by-owner',
      query.startedAtFrom,
      query.startedAtTo,
      query.limit,
    ],
    queryFn: () => getStatsByOwner(query),
  })
  const byRunner = useQuery({
    queryKey: [
      'stats',
      'by-runner',
      query.startedAtFrom,
      query.startedAtTo,
      query.limit,
    ],
    queryFn: () => getStatsByRunner(query),
  })
  const byCase = useQuery({
    queryKey: [
      'stats',
      'by-case',
      query.startedAtFrom,
      query.startedAtTo,
      query.limit,
    ],
    queryFn: () => getStatsByCase(query),
  })

  return {
    byDate,
    byOwner,
    byRunner,
    byCase,
  }
}
