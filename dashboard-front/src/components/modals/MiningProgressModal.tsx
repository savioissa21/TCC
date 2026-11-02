import { useEffect, useRef, useState } from "react";
import { miningService } from "../../services/miningService";
import { CheckCircle, XCircle, Brain, Clock3, WifiOff } from "lucide-react";
import { type MiningStatus } from "../../types";
import { useModalFocus } from "../../hooks/useModalFocus";
import { motion } from "framer-motion";
import { Button } from "../ui/button";
import { EditorialLabel } from "../ui/editorial";
import { pageReveal } from "../../lib/motion";

interface Props {
  jobId: string | null;
  establishmentName: string;
  onComplete: (message?: string) => void;
  onError: (message?: string) => void;
  onDismiss?: () => void;
}

const POLL_INTERVAL_MS = 3000;
const MAX_NETWORK_FAILURES = 5;
const MAX_TRACKING_MS = 30 * 60 * 1000;

export function MiningProgressModal({ jobId, establishmentName, onComplete, onError, onDismiss }: Props) {
  if (!jobId) return null;

  return (
    <MiningProgressSession
      key={jobId}
      jobId={jobId}
      establishmentName={establishmentName}
      onComplete={onComplete}
      onError={onError}
      onDismiss={onDismiss}
    />
  );
}

function MiningProgressSession({ jobId, establishmentName, onComplete, onError, onDismiss }: Omit<Props, "jobId"> & { jobId: string }) {
  const [status, setStatus] = useState<MiningStatus | null>(null);
  const [networkFailures, setNetworkFailures] = useState(0);
  const panel = useModalFocus(true, onDismiss);
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
          if (!nextStatus.message.startsWith("Coleta parcial:")) {
            resultTimer = setTimeout(() => onCompleteRef.current(nextStatus.message), 800);
          }
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
  const isPartial = isDone && status.message.startsWith("Coleta parcial:");
  const isFailed = status?.state === "FAILED";
  const isQueued = status?.state === "QUEUED";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm">
      <motion.div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Acompanhamento da mineração"
        initial="hidden"
        animate="visible"
        variants={pageReveal}
        className="w-full max-w-md overflow-hidden rounded-[1.25rem] border border-white/50 bg-surface shadow-2xl"
      >
        <div className="border-b border-border px-7 py-5 text-left">
          <EditorialLabel>Coleta de avaliações</EditorialLabel>
          <p className="mt-2 truncate text-sm font-bold text-ink" title={establishmentName}>{establishmentName}</p>
        </div>
        <div className="px-7 py-8 text-center">
        {isDone ? (
          <>
            <div className={isPartial ? "mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600" : "mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-evergreen/10 text-evergreen"}>
              <CheckCircle size={31} aria-hidden="true" />
            </div>
            <h3 className="text-xl font-black tracking-[-0.035em] text-ink">{isPartial ? "Coleta parcial" : "Mineração concluída!"}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {status.reviewsImported} avaliações novas importadas para <strong>{establishmentName}</strong>.
            </p>
            {isPartial && <>
              <p role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-sm leading-relaxed text-amber-800">{status.message}</p>
              <Button onClick={() => onCompleteRef.current(status.message)} className="mt-5 w-full">Ver avaliações</Button>
            </>}
          </>
        ) : isFailed ? (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
              <XCircle size={31} aria-hidden="true" />
            </div>
            <h3 className="text-xl font-black tracking-[-0.035em] text-ink">Falha na mineração</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{status.message}</p>
          </>
        ) : (
          <>
            <div className="relative mx-auto mb-6 h-20 w-20">
              <div className="absolute inset-0 rounded-full border border-border bg-marble" />
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-evergreen motion-reduce:animate-none" />
              <div className="absolute inset-0 flex items-center justify-center">
                {isQueued ? <Clock3 size={27} className="text-evergreen" /> : <Brain size={27} className="text-evergreen" />}
              </div>
            </div>
            <h3 className="text-xl font-black tracking-[-0.035em] text-ink">
              {isQueued ? "Aguardando na fila" : "IA em ação"}
            </h3>
            <p aria-live="polite" className="mt-3 flex min-h-10 items-center justify-center text-sm leading-relaxed text-muted-foreground">
              {status?.message || "Consultando o status da mineração..."}
            </p>
            {networkFailures > 0 && (
              <p role="status" className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                <WifiOff size={13} /> Reconectando ({networkFailures}/{MAX_NETWORK_FAILURES})...
              </p>
            )}
            <p className="mt-5 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
              O trabalho fica salvo. Você pode sair desta tela e consultar a loja depois.
            </p>
            {onDismiss && <Button type="button" variant="outline" onClick={onDismiss} className="mt-5 w-full">
              Continuar em segundo plano
            </Button>}
          </>
        )}
        </div>
      </motion.div>
    </div>
  );
}
