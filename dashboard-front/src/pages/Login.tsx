import { ArrowRight, Lock, Mail } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthShell } from "../components/layout/AuthShell";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useAuth } from "../hooks/useAuth";

export function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await signIn({ email, pass: password });
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Acesso ao painel"
      title="Bem-vindo de volta"
      description="Entre para acompanhar a percepção dos clientes e as atualizações das suas lojas."
      footer={<>Não tem uma conta? <Link to="/register" className="font-bold text-evergreen underline-offset-4 hover:underline">Criar agora</Link></>}
    >
      <form aria-label="Entrar na plataforma" onSubmit={handleSubmit} className="space-y-5">
        <Input label="Email" type="email" maxLength={254} autoComplete="email" placeholder="admin@nexo.com" value={email} onChange={(event) => setEmail(event.target.value)} icon={<Mail size={18} />} required />
        <Input label="Senha" type="password" maxLength={72} autoComplete="current-password" placeholder="••••••••" value={password} onChange={(event) => setPassword(event.target.value)} icon={<Lock size={18} />} required />
        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-semibold text-red-800 animate-in slide-in-from-top-1">{error}</div>}
        <Button className="w-full" size="lg" isLoading={isLoading}>
          Entrar na Plataforma <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Button>
      </form>
    </AuthShell>
  );
}
