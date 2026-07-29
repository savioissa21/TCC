import { useState, type FormEvent } from "react";
import { X, Store, Link } from "lucide-react";

const SEARCH_URL_ERROR =
  "Links de pesquisa não são aceitos. Selecione um estabelecimento específico no Google Maps e copie o link da página da empresa.";
const SPECIFIC_PLACE_URL_ERROR =
  "Esse link não identifica um estabelecimento específico. Abra a página da empresa no Google Maps e copie a URL completa, que deve conter /maps/place/.";
const GOOGLE_MAPS_URL_ERROR =
  "Informe o link completo da página de um estabelecimento no Google Maps. Links genéricos ou encurtados não são aceitos.";
const SHORTENED_URL_ERROR =
  "Links encurtados do Google Maps não são aceitos. Use o link completo da página do estabelecimento.";
const DIRECT_PLACE_URL_ERROR =
  "Esse link não é um link direto de estabelecimento do Google Maps. Use a URL da página do estabelecimento sem parâmetros de compartilhamento.";

function getMapsUrlError(value: string) {
  if (!value) return "";

  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const parsedUrl = new URL(trimmed);
    const host = parsedUrl.hostname.toLowerCase();
    const path = parsedUrl.pathname.toLowerCase();
    const isGoogleHost =
      /(^|.*\.)google\.[a-z]{2,3}(\.[a-z]{2})?$/.test(host) ||
      host.includes("google") ||
      host.includes("maps.app.goo.gl");

    if (host.includes("maps.app.goo.gl") || host.includes("goo.gl"))
      return SHORTENED_URL_ERROR;
    if (!isGoogleHost) return GOOGLE_MAPS_URL_ERROR;
    if (path === "/maps/search" || path.includes("/maps/search/"))
      return SEARCH_URL_ERROR;
    if (!path.includes("/maps/place/")) return SPECIFIC_PLACE_URL_ERROR;
    if (parsedUrl.search) return DIRECT_PLACE_URL_ERROR;

    return "";
  } catch {
    return GOOGLE_MAPS_URL_ERROR;
  }
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; url: string }) => void;
  isLoading: boolean;
}

export function CreateEstablishmentModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: Props) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");

  if (!isOpen) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;

    const validationError = getMapsUrlError(url.trim());
    if (validationError) {
      setUrlError(validationError);
      return;
    }

    onSubmit({ name: name.trim(), url: url.trim() });
  }

  function handleUrlChange(value: string) {
    setUrl(value);
    setUrlError(getMapsUrlError(value.trim()));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Adicionar Estabelecimento
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              A IA irá coletar e analisar as avaliações automaticamente.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
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
              onChange={(e) => handleUrlChange(e.target.value)}
              required
              disabled={isLoading}
              aria-invalid={Boolean(urlError)}
              aria-describedby={urlError ? "maps-url-error" : undefined}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 transition disabled:opacity-50 ${
                urlError
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
                  : "border-slate-200 focus:border-slate-900 focus:ring-slate-900/10"
              }`}
            />
            {urlError ? (
              <p
                id="maps-url-error"
                className="text-xs font-medium text-red-600"
              >
                {urlError}
              </p>
            ) : (
              <p className="text-xs text-slate-400">
                Abra o estabelecimento específico no Google Maps e copie o link
                da página da empresa.
              </p>
            )}
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
              disabled={
                isLoading || !name.trim() || !url.trim() || Boolean(urlError)
              }
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
