export interface InstagramReport {
  id: string;
  handle: string;
  created_at: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface SubmitResponse {
  success: boolean;
  handle?: string;
  error?: string;
}
