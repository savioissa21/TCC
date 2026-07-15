import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { STORAGE_KEYS } from "./storage";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8080";

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
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
