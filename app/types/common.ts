// Common utility types used across the application

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export type CaseActionType = 'loaded' | 'created' | 'deleted' | null;

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  [key: string]: string | number | boolean | null | undefined;
}

export interface SearchParams extends PaginationParams, SortParams, FilterParams {
  query?: string;
}