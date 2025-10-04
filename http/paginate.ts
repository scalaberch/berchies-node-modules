
export interface PageStatusObject {
  first: number;
  previous: number;
  current: number;
  next: number;
  last: number;
  total: number;
}

export interface PaginationObject {
  items: Array<any>;
  itemsPerPage: number;
  page: PageStatusObject;
  totalItems: number;
}