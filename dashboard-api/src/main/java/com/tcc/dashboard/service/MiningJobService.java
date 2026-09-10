package com.tcc.dashboard.service;

import com.tcc.dashboard.exception.BadRequestException;
import com.tcc.dashboard.exception.NotFoundException;
import com.tcc.dashboard.model.Establishment;
import com.tcc.dashboard.model.MiningJob;
import com.tcc.dashboard.model.MiningJobState;
import com.tcc.dashboard.repository.EstablishmentRepository;
import com.tcc.dashboard.repository.MiningJobRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.UUID;
import java.util.concurrent.Executor;

@Service
public class MiningJobService {

    private static final Logger logger = LoggerFactory.getLogger(MiningJobService.class);
    private static final EnumSet<MiningJobState> ACTIVE_STATES =
            EnumSet.of(MiningJobState.QUEUED, MiningJobState.RUNNING);
    private static final String QUEUE_FULL_MESSAGE =
            "A fila de mineração está cheia. Tente atualizar novamente em alguns minutos.";

    private final MiningService miningService;
    private final MiningJobRepository miningJobRepository;
    private final EstablishmentRepository establishmentRepository;
    private final Executor miningTaskExecutor;

    @Value("${mining.schedule.retry-interval:PT24H}")
    private Duration retryInterval;

    public MiningJobService(
            MiningService miningService,
            MiningJobRepository miningJobRepository,
            EstablishmentRepository establishmentRepository,
            @Qualifier("miningTaskExecutor") Executor miningTaskExecutor) {
        this.miningService = miningService;
        this.miningJobRepository = miningJobRepository;
        this.establishmentRepository = establishmentRepository;
        this.miningTaskExecutor = miningTaskExecutor;
    }

    public record MiningStatus(MiningJobState state, String message, int reviewsImported,
            LocalDateTime updatedAt) {
        static MiningStatus from(MiningJob job) {
            return new MiningStatus(job.getState(), job.getMessage(), job.getReviewsImported(),
                    job.getUpdatedAt());
        }
    }

    public synchronized String startJob(Long establishmentId, String url) {
        var active = miningJobRepository
                .findFirstByEstablishmentIdAndStateInOrderByCreatedAtDesc(establishmentId, ACTIVE_STATES);
        if (active.isPresent()) {
            return active.get().getId();
        }

        Establishment establishment = establishmentRepository.findById(establishmentId)
                .orElseThrow(() -> new NotFoundException("Estabelecimento não encontrado."));
        LocalDateTime now = LocalDateTime.now();
        MiningJob job = new MiningJob();
        job.setId(UUID.randomUUID().toString());
        job.setEstablishment(establishment);
        job.setState(MiningJobState.QUEUED);
        job.setMessage("Aguardando na fila de mineração...");
        job.setCreatedAt(now);
        job.setUpdatedAt(now);
        miningJobRepository.saveAndFlush(job);

        establishment.setLastMiningStatus("QUEUED");
        establishment.setLastMiningMessage(job.getMessage());
        establishment.setLastNewReviews(0);
        establishmentRepository.save(establishment);

        submit(job.getId(), establishmentId, url);
        return job.getId();
    }

    private void submit(String jobId, Long establishmentId, String url) {
        try {
            miningTaskExecutor.execute(() -> runMining(jobId, establishmentId, url));
        } catch (RuntimeException error) {
            logger.warn("Fila de mineração rejeitou o job {} do estabelecimento {}",
                    jobId, establishmentId, error);
            failJob(jobId, QUEUE_FULL_MESSAGE);
            markEstablishmentQueueFailure(establishmentId);
        }
    }

    void runMining(String jobId, Long establishmentId, String url) {
        try {
            updateJob(jobId, MiningJobState.RUNNING,
                    "Coletando e analisando as avaliações do Google Maps...", 0, false);
            int count = miningService.startMining(url, establishmentId);
            String message = count == 0
                    ? "Atualização concluída. Nenhuma avaliação nova."
                    : "Atualização concluída com sucesso!";
            updateJob(jobId, MiningJobState.COMPLETED, message, count, true);
        } catch (Exception error) {
            logger.error("Falha no job de mineração {} do estabelecimento {}", jobId,
                    establishmentId, error);
            failJob(jobId, publicFailureMessage(error));
        }
    }

    public MiningStatus getStatus(String jobId, String userEmail) {
        MiningJob job = miningJobRepository.findOwnedJob(jobId, userEmail)
                .orElseThrow(() -> new NotFoundException("Job de mineração não encontrado."));
        return MiningStatus.from(job);
    }

    @EventListener(ApplicationReadyEvent.class)
    public synchronized void recoverInterruptedJobs() {
        var unfinished = miningJobRepository.findByStateInOrderByCreatedAtAsc(ACTIVE_STATES);
        if (!unfinished.isEmpty()) {
            logger.info("Recuperando {} job(s) de mineração interrompido(s).", unfinished.size());
        }
        for (MiningJob job : unfinished) {
            job.setState(MiningJobState.QUEUED);
            job.setMessage("Retomando mineração interrompida pelo reinício da aplicação...");
            job.setUpdatedAt(LocalDateTime.now());
            job.setStartedAt(null);
            job.setFinishedAt(null);
            miningJobRepository.save(job);
            submit(job.getId(), job.getEstablishment().getId(), job.getEstablishment().getMapsUrl());
        }
    }

    private void updateJob(String jobId, MiningJobState state, String message, int imported,
            boolean finished) {
        miningJobRepository.findById(jobId).ifPresent(job -> {
            LocalDateTime now = LocalDateTime.now();
            job.setState(state);
            job.setMessage(message);
            job.setReviewsImported(imported);
            job.setUpdatedAt(now);
            if (state == MiningJobState.RUNNING && job.getStartedAt() == null) {
                job.setStartedAt(now);
            }
            if (finished) {
                job.setFinishedAt(now);
            }
            miningJobRepository.save(job);
        });
    }

    private void failJob(String jobId, String message) {
        updateJob(jobId, MiningJobState.FAILED, message, 0, true);
    }

    private void markEstablishmentQueueFailure(Long establishmentId) {
        establishmentRepository.findById(establishmentId).ifPresent(establishment -> {
            establishment.setLastMiningStatus("FAILED");
            establishment.setLastMiningMessage(QUEUE_FULL_MESSAGE);
            establishment.setLastNewReviews(0);
            establishment.setNextMiningAt(LocalDateTime.now().plus(retryInterval));
            establishmentRepository.save(establishment);
        });
    }

    static String publicFailureMessage(Exception error) {
        String message = error.getMessage();
        if (error instanceof BadRequestException && message != null && (
                message.startsWith("Nenhuma avaliação")
                        || message.startsWith("O Google Maps")
                        || message.startsWith("A página abriu")
                        || message.startsWith("A mineração excedeu"))) {
            return message;
        }
        return "Não foi possível concluir a mineração. Tente novamente em alguns minutos.";
    }
}
