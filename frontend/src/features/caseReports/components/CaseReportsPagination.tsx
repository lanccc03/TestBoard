import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { cn } from '@/lib/utils'

type CaseReportsPaginationProps = {
  page: number
  total: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function CaseReportsPagination({
  page,
  total,
  totalPages,
  onPageChange,
}: CaseReportsPaginationProps) {
  const hasPrevious = page > 1
  const hasNext = page < totalPages

  function handlePageClick(
    event: React.MouseEvent<HTMLAnchorElement>,
    nextPage: number,
    enabled: boolean,
  ) {
    event.preventDefault()
    if (enabled) {
      onPageChange(nextPage)
    }
  }

  return (
    <div className="flex items-center justify-between px-5 py-4">
      <p className="text-muted-foreground text-sm">
        共 {total} 条，当前第 {page} / {Math.max(totalPages, 1)} 页
      </p>

      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#previous-page"
              text="上一页"
              aria-label="上一页"
              aria-disabled={!hasPrevious}
              tabIndex={hasPrevious ? undefined : -1}
              className={cn(!hasPrevious && 'pointer-events-none opacity-50')}
              onClick={(event) => handlePageClick(event, page - 1, hasPrevious)}
            />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#current-page" isActive>
              {page}
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              href="#next-page"
              text="下一页"
              aria-label="下一页"
              aria-disabled={!hasNext}
              tabIndex={hasNext ? undefined : -1}
              className={cn(!hasNext && 'pointer-events-none opacity-50')}
              onClick={(event) => handlePageClick(event, page + 1, hasNext)}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
