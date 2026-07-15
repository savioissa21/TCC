import { useState } from "react";
import { establishmentService } from "../services/establishmentService";
import { type CreateEstablishmentDTO, type Establishment } from "../types";

export function useEstablishment() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createEstablishment = async (data: CreateEstablishmentDTO): Promise<Establishment | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const { establishment } = await establishmentService.create(data);
      return establishment;
    } catch (err: any) {
      const msg = err.response?.data?.message || "Erro ao criar estabelecimento.";
      setError(msg);
      console.error(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createEstablishment,
    isLoading,
    error
  };
}