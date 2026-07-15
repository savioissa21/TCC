import { api } from "../lib/api";
import { type MiningStatus } from "../types";

export const miningService = {
  async getStatus(jobId: string): Promise<MiningStatus> {
    const response = await api.get<MiningStatus>(`/mining/status/${jobId}`);
    return response.data;
  },
};
