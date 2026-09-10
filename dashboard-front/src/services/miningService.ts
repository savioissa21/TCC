import { api } from "../lib/api";
import { type MiningStatus } from "../types";

export const miningService = {
  async getStatus(jobId: string, signal?: AbortSignal): Promise<MiningStatus> {
    const response = await api.get<MiningStatus>(`/mining/status/${jobId}`, { signal });
    return response.data;
  },
};
