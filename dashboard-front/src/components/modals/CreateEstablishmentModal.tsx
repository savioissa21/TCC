import { useState, type FormEvent } from "react";
import { X, Store, Link } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; url: string }) => void;
  isLoading: boolean;
}

export function CreateEstablishmentModal({ isOpen, onClose, onSubmit, isLoading }: Props) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  if (!isOpen) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;
    onSubmit({ name: name.trim(), url: url.trim() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Adicionar Estabelecimento</h2>
            <p className="text-sm text-slate-500 mt-0.5">A IA irá coletar e analisar as avaliações automaticamente.</p>
          </div>
          <button onClick={onClose} disabled={isLoading} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
              <Store size={14} />
              Nome do Estabelecimento
            </label>
            <input
              type="text"
              placeholder="Ex: Pizzaria do João"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isLoading}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition disabled:opacity-50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
              <Link size={14} />
              URL do Google Maps
            </label>
            <input
              type="url"
              placeholder="https://maps.google.com/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              disabled={isLoading}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition disabled:opacity-50"
            />
            <p className="text-xs text-slate-400">Cole a URL completa da página de avaliações do Google Maps.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim() || !url.trim()}
              className="flex-1 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Criando..." : "Criar e Minerar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
