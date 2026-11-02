import { ArrowRight, Lock, Mail, User } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthShell } from "../components/layout/AuthShell";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useAuth } from "../hooks/useAuth";
import { authService } from "../services/authService";

export function Register() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await authService.register({ name, email, pass: password });
      await signIn({ email, pass: password });
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar conta. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Comece sua análise"
      title="Crie sua conta"
      description="Cadastre-se para reunir avaliações, acompanhar aspectos e transformar comentários em sinais claros."
      footer={<>Já tem uma conta? <Link to="/login" className="font-bold text-evergreen underline-offset-4 hover:underline">Fazer login</Link></>}
    >
      <form aria-label="Criar conta" onSubmit={handleSubmit} className="space-y-5">
        <Input label="Nome Completo" type="text" minLength={2} maxLength={100} autoComplete="name" placeholder="Seu nome" value={name} onChange={(event) => setName(event.target.value)} icon={<User size={18} />} required />
        <Input label="Email Corporativo" type="email" maxLength={254} autoComplete="email" placeholder="voce@empresa.com" value={email} onChange={(event) => setEmail(event.target.value)} icon={<Mail size={18} />} required />
        <Input label="Senha" type="password" minLength={6} maxLength={72} autoComplete="new-password" placeholder="Mínimo 6 caracteres" value={password} onChange={(event) => setPassword(event.target.value)} icon={<Lock size={18} />} required />
        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-semibold text-red-800 animate-in slide-in-from-top-1">{error}</div>}
        <Button className="w-full" size="lg" isLoading={isLoading}>
          Criar Conta Grátis <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Button>
      </form>
    </AuthShell>
  );
}
