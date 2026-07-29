import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { STORAGE_KEYS } from "./storage";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8085";

export const api = axios.create({
  baseURL,
  timeout: 600000, // 10 minutos — mineração pode demorar
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string; detail?: string }>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
      window.location.href = "/login";
    }

    const message = error.response?.data?.error || error.response?.data?.detail || error.message || "Ocorreu um erro inesperado.";
    return Promise.reject(new Error(message));
  }
);
