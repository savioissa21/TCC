import { Plus, RefreshCcw } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { EditorialLabel } from "../ui/editorial";

interface DashboardHeaderProps {
  userName?: string;
  isLoading: boolean;
  onRefresh: () => void;
  onNewStore: () => void;
}

export function DashboardHeader({ userName, isLoading, onRefresh, onNewStore }: DashboardHeaderProps) {
  return (
    <header className="flex flex-col justify-between gap-6 border-b border-ink/10 pb-7 sm:flex-row sm:items-end">
      <div className="min-w-0">
        <EditorialLabel>Inteligência da experiência</EditorialLabel>
        <h1 className="editorial-rule mt-3 text-3xl font-black tracking-[-0.055em] text-ink sm:text-4xl">
          Olá, {userName || "Gestor"}.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Acompanhe a percepção dos clientes, compare os sinais e descubra onde agir primeiro.
        </p>
      </div>
      <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:shrink-0">
        <Button variant="outline" onClick={onRefresh} disabled={isLoading}>
          <RefreshCcw size={15} className={cn("mr-2", isLoading && "animate-spin")} aria-hidden="true" />
          Atualizar
        </Button>
        <Button onClick={onNewStore}>
          <Plus size={15} className="mr-2" aria-hidden="true" />
          Nova Loja
        </Button>
      </div>
    </header>
  );
}
