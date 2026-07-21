export interface LoginInput {
  username: string;
  password: string;
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
}

export interface AuthMessage {
  message: string;
  email_sent?: boolean;
}

export interface AuthTokensResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user_id: number;
  username: string;
  access_token_expires_in: number;
  refresh_token_expires_in: number;
}

export interface UserProfile {
  user: string;
  user_id: number;
  email: string;
  is_verified: boolean;
}
