import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { useTranslation } from "react-i18next";

export const DEFAULT_TABLE_PAGE_SIZE = 20;
export const TABLE_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

interface TableProps extends HTMLAttributes<HTMLTableElement> {
  containerClassName?: string;
}

export function Table({ className, containerClassName, ...props }: TableProps) {
  return (
    <div className={cn("w-full overflow-auto", containerClassName)}>
      <table className={cn("w-full text-sm", className)} {...props} />
    </div>
  );
}

export function TableLayout({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex min-h-0 flex-1 flex-col gap-4", className)} {...props} />;
}

export function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        "sticky top-0 z-10 [&>tr]:border-0 [&>tr]:bg-[#EAF0FF] [&>tr:hover]:bg-[#EAF0FF] [&>tr>th:first-child]:rounded-l-2xl [&>tr>th:last-child]:rounded-r-2xl",
        className,
      )}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn(className)} {...props} />;
}

const tableEmptyStateClasses = "flex min-h-56 w-full shrink-0 items-center justify-center rounded-2xl border border-[#E3E8F0] bg-[#F7F8FA] text-sm text-muted-foreground";

export function TableEmptyState({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(tableEmptyStateClasses, className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function TableEmptyStatePanel({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(tableEmptyStateClasses, className)} {...props}>
      {children}
    </div>
  );
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("border-b border-border last:border-0", className)} {...props} />;
}

export function TableHead({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "h-12 px-5 text-left text-sm font-semibold uppercase tracking-wide text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-5 py-5", className)} {...props} />;
}

interface TablePaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  pageSizeOptions?: readonly number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  className?: string;
}

export function TablePagination({
  page,
  pageSize,
  totalCount,
  pageSizeOptions = TABLE_PAGE_SIZE_OPTIONS,
  onPageChange,
  onPageSizeChange,
  className,
}: TablePaginationProps) {
  const { t } = useTranslation();
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className={cn("flex shrink-0 flex-col-reverse items-stretch gap-2 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-end sm:gap-5", className)}>
      <div className="flex flex-wrap items-center justify-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg"
          aria-label={t("firstPage")}
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
        >
          <ChevronsLeft aria-hidden="true" className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg"
          aria-label={t("previousPage")}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
        </Button>
        <span aria-current="page" className="order-first w-full px-1 text-center text-sm font-medium tabular-nums text-foreground sm:order-none sm:w-auto">
          {t("pageOfTotal", { page, total: totalPages })}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg"
          aria-label={t("nextPage")}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg"
          aria-label={t("lastPage")}
          disabled={page >= totalPages}
          onClick={() => onPageChange(totalPages)}
        >
          <ChevronsRight aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>
      <label className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
        {t("itemsPerPage")}
        <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
          <SelectTrigger aria-label={t("pageSize")} className="h-8 w-auto gap-1 rounded-lg border-border px-2 pr-2 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((option) => <SelectItem key={option} value={String(option)}>{option}</SelectItem>)}
          </SelectContent>
        </Select>
      </label>
    </div>
  );
}
