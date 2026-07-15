// src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from "react";
import { jwtDecode } from "jwt-decode";
import { api } from "../lib/api";
import { STORAGE_KEYS } from "../lib/storage";
import { type AuthResponse, type User } from "../types";

interface SignInCredentials {
  email: string;
  pass: string;
}

interface JWTPayload {
  sub: string;
  iss: string;
  exp: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  signIn: (credentials: SignInCredentials) => Promise<void>;
  signOut: () => void;
  isLoading: boolean;
}

const AuthContext = createContext({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. DEFINIR O SIGNOUT PRIMEIRO (Para ser usado no useEffect)
  // Usamos useCallback para garantir que a função não seja recriada a cada render (boa prática)
  const signOut = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    
    // Limpa o header do axios
    delete api.defaults.headers.common["Authorization"];
    
    setUser(null);
  }, []);

  // 2. DEFINIR O SIGNIN
  const signIn = useCallback(async ({ email, pass }: SignInCredentials) => {
    try {
      const response = await api.post<AuthResponse>("/auth/login", { 
        email, 
        password: pass 
      });

      const { token, name } = response.data;

      const decoded = jwtDecode<JWTPayload>(token);
      const userEmail = decoded.sub; 

      const userLogged: User = {
        id: "uuid-indisponivel-no-login", 
        name: name,
        email: userEmail,
      };

      localStorage.setItem(STORAGE_KEYS.TOKEN, token);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userLogged));

      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      setUser(userLogged);

    } catch (error) {
      console.error("Erro ao logar:", error);
      throw error;
    }
  }, []);

  // 3. EFEITO DE CARREGAMENTO (Agora ele enxerga o signOut porque foi declarado acima)
  useEffect(() => {
    const recoverUser = () => {
      const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
      const storedUser = localStorage.getItem(STORAGE_KEYS.USER);

      if (storedToken && storedUser) {
        try {
          const decoded = jwtDecode<JWTPayload>(storedToken);
          const isExpired = decoded.exp * 1000 < Date.now();

          if (isExpired) {
            signOut(); // Agora funciona!
            return;
          }

          setUser(JSON.parse(storedUser));
          api.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
        } catch (error) {
          console.error("Token inválido no storage", error);
          signOut();
        }
      }
      setIsLoading(false);
    };

    recoverUser();
  }, [signOut]); // Adicione signOut nas dependências

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      signIn, 
      signOut,
      isLoading 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// SOBRE O ERRO DE FAST REFRESH:
// Se o aviso "Fast refresh only works when a file only exports components" persistir e te incomodar,
// a solução ideal é mover este hook abaixo para um arquivo separado chamado 'useAuth.ts'.
// Mas, para fins de TCC, você pode ignorar o aviso ou manter assim que funciona.
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}