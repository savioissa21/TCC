import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { authService } from "../services/authService";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "../components/ui/card";
import { Sparkles, ArrowRight, Lock, Mail, User } from "lucide-react";

export function Register() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // 1. Cria a conta
      await authService.register({ name, email, pass: password });
      
      // 2. Login automático
      await signIn({ email, pass: password });
      
      // 3. Redireciona
      navigate("/dashboard");
      
    } catch (err: any) {
      const msg = err.response?.data || "Erro ao criar conta. Tente novamente.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 transition-colors duration-300">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
        
        {/* Branding */}
        <div className="flex justify-center">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Sparkles size={24} />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">NEXO</h2>
          </div>
        </div>

        <Card className="border-border shadow-xl">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">Crie sua conta</CardTitle>
            <CardDescription>
              Comece a gerenciar suas avaliações com inteligência.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <Input 
                label="Nome Completo" 
                type="text" 
                placeholder="Seu nome" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                icon={<User size={18} />}
                required
              />

              <Input 
                label="Email Corporativo" 
                type="email" 
                placeholder="voce@empresa.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail size={18} />}
                required
              />

              <Input 
                label="Senha" 
                type="password" 
                placeholder="Mínimo 6 caracteres" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<Lock size={18} />}
                required
                minLength={6}
              />

              {error && (
                <div className="flex items-center p-3 rounded-md bg-destructive/15 border border-destructive/20 text-destructive text-sm font-medium animate-in slide-in-from-top-1">
                  {error}
                </div>
              )}

              <Button className="w-full font-bold" size="lg" isLoading={isLoading}>
                Criar Conta Grátis <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-sm text-muted-foreground">
              Já tem uma conta?{" "}
              <Link to="/login" className="font-semibold text-primary hover:underline underline-offset-4 transition-all">
                Fazer login
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}