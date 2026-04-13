export interface ApiErrorPayload {
  message?: string;
  error?: string;
  statusCode?: number;
}

export interface PresignRequest {
  fileName: string;
  contentType: string;
}

export interface PresignResponse {
  uploadUrl: string;
  fileUrl: string;
}
