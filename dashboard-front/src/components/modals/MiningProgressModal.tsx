import { useEffect, useState } from "react";
import { miningService } from "../../services/miningService";
import { CheckCircle, XCircle, Brain } from "lucide-react";
import { type MiningStatus } from "../../types";

interface Props {
  jobId: string | null;
  establishmentName: string;
  onComplete: () => void;
  onError: () => void;
}

const STEPS = [
  "Abrindo Google Maps...",
  "Rolando página para carregar avaliações...",
  "Expandindo comentários longos...",
  "Aplicando modelo BERT de sentimento...",
  "Classificando aspectos (Comida, Atendimento...)...",
  "Salvando análises no banco de dados...",
];

export function MiningProgressModal({ jobId, establishmentName, onComplete, onError }: Props) {
  const [status, setStatus] = useState<MiningStatus | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  // Cicla pelos passos animados independente do backend
  useEffect(() => {
    if (!jobId) return;
    const interval = setInterval(() => {
      setStepIndex((i) => (i + 1) % STEPS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [jobId]);

  // Polling de status real
  useEffect(() => {
    if (!jobId) return;

    const poll = setInterval(async () => {
      try {
        const s = await miningService.getStatus(jobId);
        setStatus(s);
        if (s.state === "COMPLETED") {
          clearInterval(poll);
          setTimeout(onComplete, 1200);
        } else if (s.state === "FAILED") {
          clearInterval(poll);
          setTimeout(onError, 1200);
        }
      } catch {
        // ignora erros de rede temporários
      }
    }, 3000);

    return () => clearInterval(poll);
  }, [jobId, onComplete, onError]);

  if (!jobId) return null;

  const isDone = status?.state === "COMPLETED";
  const isFailed = status?.state === "FAILED";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-8 text-center animate-in zoom-in-95 duration-200">
        {isDone ? (
          <>
            <CheckCircle size={52} className="text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900">Mineração Concluída!</h3>
            <p className="text-slate-500 text-sm mt-1">
              {status.reviewsImported} avaliações analisadas para <strong>{establishmentName}</strong>.
            </p>
          </>
        ) : isFailed ? (
          <>
            <XCircle size={52} className="text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900">Falha na Mineração</h3>
            <p className="text-slate-500 text-sm mt-1">{status?.message}</p>
          </>
        ) : (
          <>
            <div className="relative mx-auto w-16 h-16 mb-5">
              <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
              <div className="absolute inset-0 rounded-full border-4 border-t-slate-900 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Brain size={24} className="text-slate-700" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">IA em ação</h3>
            <p className="text-sm font-medium text-slate-600 mb-1">{establishmentName}</p>
            <p className="text-xs text-slate-400 h-10 flex items-center justify-center transition-all duration-500">
              {STEPS[stepIndex]}
            </p>
            <div className="mt-5 flex gap-1 justify-center">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="inline-block h-1.5 w-1.5 rounded-full bg-slate-900 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-4">
              Isso pode levar alguns minutos. Não feche esta janela.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
