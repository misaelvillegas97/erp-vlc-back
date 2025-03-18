export class PaginationDto<T> {
  page: number;
  limit: number;
  totalElements: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  items: T[];

  constructor({page, limit, total, items}: { page: number; limit: number; total: number; items: T[] }) {
    this.page = page;
    this.limit = limit;
    this.totalElements = total;
    this.totalPages = Math.ceil(total / limit);
    this.hasNextPage = page < this.totalPages;
    this.hasPrevPage = page > 1;
    this.items = items;
  }
}
