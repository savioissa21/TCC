import { api } from "../lib/api";
import { type Review } from "../types";

export const reviewService = {
  async getAll(): Promise<Review[]> {
    const response = await api.get<Review[]>("/api/reviews");
    return response.data;
  },

  async getByEstablishment(establishmentId: number): Promise<Review[]> {
    const response = await api.get<Review[]>(`/api/reviews/establishment/${establishmentId}`);
    return response.data;
  },
};
