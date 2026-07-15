// src/services/authService.ts
import { api } from "../lib/api";
import { STORAGE_KEYS } from "../lib/storage";
import type { AuthResponse } from "../types";

// Tipagem forte para os dados de entrada e saída
interface LoginRequest {
  email: string;
  pass: string; // ou password, depende do seu backend
}

interface RegisterRequest {
  name: string;
  email: string;
  pass: string;
}

interface LoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export const authService = {
  async login(credentials: LoginRequest) {
    const { data } = await api.post<LoginResponse>("/auth/login", credentials);
    
    // Salvar token automaticamente ao logar
    localStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
    
    return data;
  },

  async register(data: RegisterRequest) {
    // Chama o endpoint POST /auth/register da sua API Java
    const response = await api.post<AuthResponse>("/auth/register", {
      name: data.name,
      email: data.email,
      password: data.pass // O DTO do Java espera "password"
    });
    return response.data;
  },

  logout() {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    // window.location.href = "/login"; // Se quiser redirecionar forçado
  }
};