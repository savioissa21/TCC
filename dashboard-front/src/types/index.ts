export type Sentiment = "Positivo" | "Negativo" | "Neutro" | string;

export interface Aspect {
  id: number;
  name: string;
  sentiment: Sentiment;
  excerpt: string;
}

export interface Review {
  id: string;
  author: string;
  text: string;
  rating: number;
  date: string;
  source: string;
  sentimentScore: number;
  overallSentiment: Sentiment;
  analysisDate?: string;
  collectedAt?: string | null;
  aspects: Aspect[];
}

export interface Establishment {
  id: number;
  name: string;
  mapsUrl: string;
  automaticUpdatesEnabled?: boolean;
  lastMiningAt?: string | null;
  lastMiningSuccessAt?: string | null;
  nextMiningAt?: string | null;
  lastNewReviews?: number;
  lastMiningStatus?: string | null;
  lastMiningMessage?: string | null;
  reviews?: Review[];
}

// Retornado pelo GET /establishments
export interface EstablishmentSummary {
  id: number;
  name: string;
  mapsUrl: string;
  reviewCount: number;
  avgRating: number;
  satisfactionScore: number;
  automaticUpdatesEnabled: boolean;
  lastMiningAt: string | null;
  lastMiningSuccessAt: string | null;
  nextMiningAt: string | null;
  lastNewReviews: number;
  lastMiningStatus: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | null;
  lastMiningMessage: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  name: string;
  token: string;
}

export interface CreateEstablishmentDTO {
  name: string;
  url: string;
}

export interface MineReviewsParams {
  url: string;
  establishmentId: number;
}

export type MiningJobState = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";

export interface MiningStatus {
  state: MiningJobState;
  message: string;
  reviewsImported: number;
  updatedAt: string;
}

// Para os gráficos de aspectos
export interface AspectStat {
  name: string;
  positive: number;
  negative: number;
  neutral: number;
  total: number;
  score: number;
}

export interface PageResponse<T> {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface ReviewStats {
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  avgRating: number;
  score: number;
  aspects: AspectStat[];
}
