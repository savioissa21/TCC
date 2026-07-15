import { useState, useCallback } from "react";
import { reviewService } from "../services/reviewService";
import { type Review } from "../types";

export function useReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Função para buscar reviews (Memorizada com useCallback)
  const fetchReviews = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await reviewService.getAll();
      setReviews(data);
      setError(null);
    } catch (err) {
      console.error("Erro ao buscar reviews", err);
      setError("Não foi possível carregar as avaliações.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    reviews,
    isLoading,
    error,
    fetchReviews
  };
}
