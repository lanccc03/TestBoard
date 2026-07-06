export function formatPassRate(passRate: number | null): string {
  if (passRate === null) {
    return '-'
  }

  return `${(passRate * 100).toFixed(1)}%`
}

export function formatCount(count: number): string {
  return `${count} 条`
}
