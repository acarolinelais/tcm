export interface PagedResult<T> {
  items: T[];
  page: number;
  page_size: number;
  total_count: number;
}
