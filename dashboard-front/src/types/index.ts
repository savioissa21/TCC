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
  aspects: Aspect[];
}

export interface Establishment {
  id: number;
  name: string;
  mapsUrl: string;
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

export type MiningJobState = "RUNNING" | "COMPLETED" | "FAILED";

export interface MiningStatus {
  state: MiningJobState;
  message: string;
  reviewsImported: number;
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
