import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "../components/ui/card";
import { Sparkles, ArrowRight, Lock, Mail } from "lucide-react";

export function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await signIn({ email, pass: password });
      navigate("/dashboard");
    } catch (err) {
      setError("Email ou senha incorretos.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 transition-colors duration-300">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-300 space-y-8">
        
        {/* Branding Moderno */}
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
            <CardTitle className="text-2xl font-bold">Bem-vindo de volta</CardTitle>
            <CardDescription>
              Entre com suas credenciais para acessar o painel.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input 
                label="Email" 
                type="email" 
                placeholder="admin@nexo.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail size={18} />}
                required
              />
              
              <div className="space-y-2">
                <Input 
                  label="Senha" 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={<Lock size={18} />}
                  required
                />
              </div>

              {error && (
                <div className="flex items-center p-3 rounded-md bg-destructive/15 border border-destructive/20 text-destructive text-sm font-medium animate-in slide-in-from-top-1">
                  {error}
                </div>
              )}

              <Button className="w-full font-bold" size="lg" isLoading={isLoading}>
                Entrar na Plataforma <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 justify-center">
            <Button variant="link" size="sm" className="text-muted-foreground hover:text-primary">
              Esqueceu sua senha?
            </Button>
          </CardFooter>
        </Card>
        
        <p className="text-center text-sm text-muted-foreground">
          Não tem uma conta?{" "}
          <Link to="/register" className="font-semibold text-primary hover:underline underline-offset-4 transition-all">
            Criar agora
          </Link>
        </p>
      </div>
    </div>
  );
}