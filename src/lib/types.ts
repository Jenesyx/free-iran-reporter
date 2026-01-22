export type ExistsStatus = 'exists' | 'not_found' | 'unknown';

export interface InstagramReport {
  id: string;
  username: string;       // normalized username without @
  profile_url: string;    // canonical IG link
  created_at: string;
  status: 'active' | 'shadow';
  exists_status: ExistsStatus;
  checked_at: string | null;
  reason: string | null;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface SubmitResponse {
  success: boolean;
  username?: string;
  message?: string;  // user-facing message
  error?: string;
}

export type SortOption = 'newest' | 'oldest' | 'a-z' | 'z-a';

export interface HandleData {
  id: string;
  username: string;
  profile_url: string;
  likes: number;
  dislikes: number;
}

export type VoteType = 'like' | 'dislike';
