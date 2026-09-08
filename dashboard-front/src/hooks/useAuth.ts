import { createContext, useContext } from "react";
import { type User } from "../types";

export interface SignInCredentials {
  email: string;
  pass: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  signIn: (credentials: SignInCredentials) => Promise<void>;
  signOut: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}
