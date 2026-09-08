import { useState, useCallback, useEffect } from "react";
import { reviewService } from "../services/reviewService";
import { type PageResponse, type Review } from "../types";

export function useReviews() {
  const [result, setResult] = useState<PageResponse<Review>>({
    content: [], number: 0, size: 8, totalElements: 0, totalPages: 0, last: true,
  });
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("Todos");
  const [search, setSearch] = useState("");
  const [revision, setRevision] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await reviewService.getAll({
          page, size: 8, sentiment: filter === "Todos" ? "" : filter, search,
        }, controller.signal);
        if (!controller.signal.aborted) {
          if (page > 0 && page >= data.totalPages) {
            setPage(Math.max(0, data.totalPages - 1));
          } else {
            setResult(data);
          }
        }
      } catch {
        if (!controller.signal.aborted) setError("Não foi possível carregar as avaliações.");
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [page, filter, search, revision]);

  const fetchReviews = useCallback(() => {
    setIsLoading(true);
    setPage(0);
    setRevision(value => value + 1);
  }, []);

  const changeFilter = (value: string) => {
    if (value === filter) return;
    setIsLoading(true); setFilter(value); setPage(0);
  };
  const changeSearch = (value: string) => {
    if (value === search) return;
    setIsLoading(true); setSearch(value); setPage(0);
  };
  const changePage = (value: number) => {
    if (value === page || value < 0 || value >= result.totalPages) return;
    setIsLoading(true); setPage(value);
  };

  return { reviews: result.content, result, page, filter, search, isLoading, error,
    fetchReviews, changeFilter, changeSearch, changePage };
}
