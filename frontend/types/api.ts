export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message?: string;
  data: T;
  meta?: Record<string, unknown>;
  timestamp?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginatedMetaResponse<T = any> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages?: number;
  };
}
