import { useEffect, useRef, useState } from "react";
import { miningService } from "../../services/miningService";
import { CheckCircle, XCircle, Brain, Clock3, WifiOff } from "lucide-react";
import { type MiningStatus } from "../../types";

interface Props {
  jobId: string | null;
  establishmentName: string;
  onComplete: () => void;
  onError: (message?: string) => void;
}

const POLL_INTERVAL_MS = 3000;
const MAX_NETWORK_FAILURES = 5;
const MAX_TRACKING_MS = 30 * 60 * 1000;

export function MiningProgressModal({ jobId, establishmentName, onComplete, onError }: Props) {
  if (!jobId) return null;

  return (
    <MiningProgressSession
      key={jobId}
      jobId={jobId}
      establishmentName={establishmentName}
      onComplete={onComplete}
      onError={onError}
    />
  );
}

function MiningProgressSession({ jobId, establishmentName, onComplete, onError }: Omit<Props, "jobId"> & { jobId: string }) {
  const [status, setStatus] = useState<MiningStatus | null>(null);
  const [networkFailures, setNetworkFailures] = useState(0);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
  }, [onComplete, onError]);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    let resultTimer: ReturnType<typeof setTimeout> | undefined;
    let consecutiveFailures = 0;
    const startedAt = Date.now();
    const controller = new AbortController();

    const scheduleNextPoll = () => {
      pollTimer = setTimeout(() => void poll(), POLL_INTERVAL_MS);
    };

    const poll = async () => {
      try {
        const nextStatus = await miningService.getStatus(jobId, controller.signal);
        if (cancelled) return;
        consecutiveFailures = 0;
        setNetworkFailures(0);
        setStatus(nextStatus);

        if (nextStatus.state === "COMPLETED") {
          resultTimer = setTimeout(() => onCompleteRef.current(), 800);
          return;
        }
        if (nextStatus.state === "FAILED") {
          resultTimer = setTimeout(() => onErrorRef.current(nextStatus.message), 800);
          return;
        }
        if (Date.now() - startedAt >= MAX_TRACKING_MS) {
          onErrorRef.current("A mineração continua demorando. Consulte o status em Minhas Lojas.");
          return;
        }
        scheduleNextPoll();
      } catch {
        if (cancelled) return;
        consecutiveFailures += 1;
        setNetworkFailures(consecutiveFailures);
        if (consecutiveFailures >= MAX_NETWORK_FAILURES) {
          onErrorRef.current("Não foi possível acompanhar a mineração. O trabalho continua salvo; consulte Minhas Lojas.");
          return;
        }
        scheduleNextPoll();
      }
    };

    void poll();
    return () => {
      cancelled = true;
      controller.abort();
      if (pollTimer) clearTimeout(pollTimer);
      if (resultTimer) clearTimeout(resultTimer);
    };
  }, [jobId]);

  const isDone = status?.state === "COMPLETED";
  const isFailed = status?.state === "FAILED";
  const isQueued = status?.state === "QUEUED";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-8 text-center animate-in zoom-in-95 duration-200">
        {isDone ? (
          <>
            <CheckCircle size={52} className="text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900">Mineração concluída!</h3>
            <p className="text-slate-500 text-sm mt-1">
              {status.reviewsImported} avaliações novas importadas para <strong>{establishmentName}</strong>.
            </p>
          </>
        ) : isFailed ? (
          <>
            <XCircle size={52} className="text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900">Falha na mineração</h3>
            <p className="text-slate-500 text-sm mt-1">{status.message}</p>
          </>
        ) : (
          <>
            <div className="relative mx-auto w-16 h-16 mb-5">
              <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
              <div className="absolute inset-0 rounded-full border-4 border-t-slate-900 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                {isQueued ? <Clock3 size={24} className="text-slate-700" /> : <Brain size={24} className="text-slate-700" />}
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {isQueued ? "Aguardando na fila" : "IA em ação"}
            </h3>
            <p className="text-sm font-medium text-slate-600 mb-3">{establishmentName}</p>
            <p className="text-xs text-slate-500 min-h-10 flex items-center justify-center">
              {status?.message || "Consultando o status da mineração..."}
            </p>
            {networkFailures > 0 && (
              <p role="status" className="mt-3 flex items-center justify-center gap-1.5 text-xs text-amber-600">
                <WifiOff size={13} /> Reconectando ({networkFailures}/{MAX_NETWORK_FAILURES})...
              </p>
            )}
            <p className="text-xs text-slate-400 mt-4">
              O trabalho fica salvo. Você pode sair desta tela e consultar a loja depois.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
