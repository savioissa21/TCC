import { api } from "../lib/api";
import { type Review, type PageResponse, type ReviewStats } from "../types";

export interface ReviewQuery {
  page?: number;
  size?: number;
  sentiment?: string;
  search?: string;
}

export const EMPTY_REVIEW_STATS: ReviewStats = {
  total: 0, positive: 0, negative: 0, neutral: 0, avgRating: 0, score: 0, aspects: [],
};

export const reviewService = {
  async getAll(params: ReviewQuery = {}, signal?: AbortSignal): Promise<PageResponse<Review>> {
    const response = await api.get<PageResponse<Review>>("/api/reviews", { params, signal });
    return response.data;
  },

  async getByEstablishment(establishmentId: number, params: ReviewQuery = {},
    signal?: AbortSignal): Promise<PageResponse<Review>> {
    const response = await api.get<PageResponse<Review>>(
      `/api/reviews/establishment/${establishmentId}`, { params, signal });
    return response.data;
  },

  async getStats(): Promise<ReviewStats> {
    const response = await api.get<ReviewStats>("/api/reviews/stats");
    return response.data;
  },
};
