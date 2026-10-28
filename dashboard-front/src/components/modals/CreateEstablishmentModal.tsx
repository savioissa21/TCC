import { useState, type FormEvent } from "react";
import { X, Store, Link } from "lucide-react";
import { useModalFocus } from "../../hooks/useModalFocus";
import { motion } from "framer-motion";
import { Button } from "../ui/button";
import { EditorialLabel } from "../ui/editorial";
import { Input } from "../ui/input";
import { pageReveal } from "../../lib/motion";

const SEARCH_URL_ERROR =
  "Links de pesquisa não são aceitos. Selecione um estabelecimento específico no Google Maps e copie o link da página da empresa.";
const SPECIFIC_PLACE_URL_ERROR =
  "Esse link não identifica um estabelecimento específico. Abra a empresa no Google Maps e use Compartilhar > Copiar link.";
const GOOGLE_MAPS_URL_ERROR =
  "Informe um link do Google Maps, como maps.app.goo.gl ou google.com/maps/place/...";
const INCOMPLETE_SHORT_URL_ERROR =
  "O link encurtado está incompleto. No Google Maps, abra a empresa e use Compartilhar > Copiar link.";

function normalizeMapsUrlInput(value: string) {
  let normalized = value.trim().replace(/\\([_&])/g, "$1");
  const markdownLink = normalized.match(/^\[[^\]]*]\((https?:\/\/.+)\)$/i);

  if (markdownLink) {
    normalized = markdownLink[1].trim();
  } else if (normalized.startsWith("<") && normalized.endsWith(">")) {
    normalized = normalized.slice(1, -1).trim();
  }

  if (
    /^(maps\.app\.goo\.gl|goo\.gl\/maps|www\.google\.|maps\.google\.)/i.test(
      normalized,
    )
  ) {
    normalized = `https://${normalized}`;
  }

  return normalized;
}

function getMapsUrlError(value: string) {
  if (!value) return "";

  const trimmed = normalizeMapsUrlInput(value);
  if (!trimmed) return "";
  if (trimmed.length > 2000) return "A URL do Google Maps é muito longa.";

  try {
    const parsedUrl = new URL(trimmed);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) return "O link informado não é uma URL válida do Google Maps.";
    const host = parsedUrl.hostname.toLowerCase();
    const path = parsedUrl.pathname.toLowerCase();
    const isModernShortLink = host === "maps.app.goo.gl";
    const isLegacyShortLink = host === "goo.gl" && path.startsWith("/maps/");

    if (isModernShortLink || isLegacyShortLink) {
      if (path.length <= 1 || path === "/maps/")
        return INCOMPLETE_SHORT_URL_ERROR;
      return "";
    }

    const isGoogleHost = /(^|.*\.)google\.[a-z]{2,3}(\.[a-z]{2})?$/.test(host);
    if (!isGoogleHost) return GOOGLE_MAPS_URL_ERROR;
    if (path === "/maps/search" || path.includes("/maps/search/"))
      return SEARCH_URL_ERROR;

    const hasNamedPlace =
      path.includes("/maps/place/") && !path.endsWith("/maps/place/");
    const placeQuery = parsedUrl.searchParams.get("q")?.toLowerCase() || "";
    const hasPlaceIdentifier =
      parsedUrl.searchParams.has("cid") ||
      parsedUrl.searchParams.has("query_place_id") ||
      placeQuery.startsWith("place_id:");

    if (!hasNamedPlace && !hasPlaceIdentifier)
      return SPECIFIC_PLACE_URL_ERROR;

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
  const panel = useModalFocus(isOpen, isLoading ? undefined : onClose);

  if (!isOpen) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2 || name.trim().length > 100 || !url.trim()) return;

    const validationError = getMapsUrlError(url.trim());
    if (validationError) {
      setUrlError(validationError);
      return;
    }

    onSubmit({ name: name.trim(), url: normalizeMapsUrlInput(url) });
  }

  function handleUrlChange(value: string) {
    setUrl(value);
    setUrlError(getMapsUrlError(value.trim()));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm">
      <motion.div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-store-title"
        initial="hidden"
        animate="visible"
        variants={pageReveal}
        className="max-h-[95dvh] w-full max-w-lg overflow-y-auto rounded-[1.25rem] border border-white/50 bg-surface shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-6 sm:px-7">
          <div>
            <EditorialLabel>Nova fonte de avaliações</EditorialLabel>
            <h2 id="create-store-title" className="mt-2 text-xl font-black tracking-[-0.035em] text-ink">Adicionar Estabelecimento</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">A coleta será iniciada assim que a loja for cadastrada.</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fechar cadastro de estabelecimento" disabled={isLoading} className="shrink-0">
            <X size={19} aria-hidden="true" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6 sm:px-7">
          <Input
            type="text"
            id="store-name"
            minLength={2}
            maxLength={100}
            label="Nome do Estabelecimento"
            placeholder="Ex: Pizzaria do João"
            value={name}
            onChange={(event) => setName(event.target.value)}
            icon={<Store size={17} />}
            required
            disabled={isLoading}
          />
          <div className="space-y-2.5">
            <Input
              type="text"
              inputMode="url"
              id="store-url"
              maxLength={2000}
              label="URL do Google Maps"
              icon={<Link size={17} />}
              onPaste={(event) => {
                const pasted = normalizeMapsUrlInput(event.clipboardData.getData("text"));
                if (pasted.length > 2000) {
                  event.preventDefault();
                  setUrlError("A URL do Google Maps é muito longa.");
                } else if (event.currentTarget.selectionStart === 0 && event.currentTarget.selectionEnd === url.length) {
                  event.preventDefault();
                  handleUrlChange(pasted);
                }
              }}
              placeholder="https://maps.app.goo.gl/..."
              value={url}
              onChange={(event) => handleUrlChange(event.target.value)}
              onBlur={() => setUrl(normalizeMapsUrlInput(url))}
              required
              disabled={isLoading}
              error={urlError || undefined}
            />
            {!urlError && <p className="text-xs leading-relaxed text-muted-foreground">Use o link de Compartilhar (maps.app.goo.gl) ou a URL completa da página da empresa.</p>}
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="flex-1">Cancelar</Button>
            <Button type="submit" isLoading={isLoading} disabled={isLoading || name.trim().length < 2 || name.trim().length > 100 || !url.trim() || Boolean(urlError)} className="flex-1">
              {isLoading ? "Criando..." : "Criar e Minerar"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
