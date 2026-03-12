// ========================================
// Auth Types
// ========================================

export interface User {
  id?: string;
  full_name: string;
  email: string;
  pending_email?: string;
  is_verified?: boolean;
  last_login?: string;
  profile_image?: string;
  phone?: string;
  two_factor_enabled?: boolean;
  provider?: string;
  created_at: string;
  modified_at?: string;
  updated_at?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface AuthResponse {
  key?: {
    access_token: string;
  };
  user?: User;
  requires_2fa?: boolean;
  temp_token?: string;
}

// ========================================
// API Types
// ========================================

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

// ========================================
// Chat Types
// ========================================

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  files?: ChatFile[];
}

export interface ChatFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface ChatTopic {
  id: string;
  title: string;
  history: ChatMessage[];
  created_at?: string;
  updated_at?: string;
}

// ========================================
// Article Types
// ========================================

export interface Article {
  id: string;
  title: string;
  content: string;
  status: "pending" | "processing" | "done" | "complete" | "error";
  article_type_name?: string;
  images?: ArticleImage[];
  created_at: string;
  modified_at: string;
  updated_at: string;
}

export interface ArticleImage {
  id: string;
  url: string;
  alt?: string;
}

export interface ArticleGeneratePayload {
  topic: string;
  article_type_name?: string;
  language?: string;
  tone?: string;
  word_count?: number;
}

// ========================================
// Collection Types
// ========================================

export interface Collection {
  id: string;
  name: string;
  description?: string;
  items_count: number;
  created_at: string;
}

// ========================================
// Notification Types
// ========================================

export interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  type: string;
  created_at: string;
}
