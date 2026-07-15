import { api } from "../lib/api";
import { type CreateEstablishmentDTO, type Establishment, type EstablishmentSummary } from "../types";

export const establishmentService = {
  async create(data: CreateEstablishmentDTO): Promise<{ establishment: Establishment; jobId: string }> {
    const response = await api.post<{ establishment: Establishment; jobId: string }>("/establishments", data);
    return response.data;
  },

  async getAll(): Promise<EstablishmentSummary[]> {
    const response = await api.get<EstablishmentSummary[]>("/establishments");
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/establishments/${id}`);
  },
};
