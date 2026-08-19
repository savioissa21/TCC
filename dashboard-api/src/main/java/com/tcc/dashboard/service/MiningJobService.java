package com.tcc.dashboard.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class MiningJobService {

    @Autowired
    private MiningService miningService;

    @Autowired
    @Lazy
    private MiningJobService self;

    public enum JobState { RUNNING, COMPLETED, FAILED }

    public record MiningStatus(JobState state, String message, int reviewsImported) {}

    private final Map<String, MiningStatus> jobs = new ConcurrentHashMap<>();
    private final Map<Long, String> activeJobsByEstablishment = new ConcurrentHashMap<>();

    public synchronized String startJob(Long establishmentId, String url) {
        if (jobs.size() > 1000) {
            jobs.entrySet().removeIf(entry -> entry.getValue().state() != JobState.RUNNING);
        }
        String activeJobId = activeJobsByEstablishment.get(establishmentId);
        if (activeJobId != null) {
            MiningStatus activeStatus = jobs.get(activeJobId);
            if (activeStatus != null && activeStatus.state() == JobState.RUNNING) {
                return activeJobId;
            }
            activeJobsByEstablishment.remove(establishmentId);
        }

        String jobId = UUID.randomUUID().toString();
        jobs.put(jobId, new MiningStatus(JobState.RUNNING, "Iniciando mineração...", 0));
        activeJobsByEstablishment.put(establishmentId, jobId);
        self.runMiningAsync(jobId, establishmentId, url);
        return jobId;
    }

    @Async("miningTaskExecutor")
    public void runMiningAsync(String jobId, Long establishmentId, String url) {
        try {
            jobs.put(jobId, new MiningStatus(
                    JobState.RUNNING, "Abrindo Google Maps e coletando avaliações...", 0));
            int count = miningService.startMining(url, establishmentId);
            String message = count == 0
                    ? "Atualização concluída. Nenhuma avaliação nova."
                    : "Atualização concluída com sucesso!";
            jobs.put(jobId, new MiningStatus(JobState.COMPLETED, message, count));
        } catch (Exception e) {
            jobs.put(jobId, new MiningStatus(JobState.FAILED, "Erro: " + e.getMessage(), 0));
        } finally {
            activeJobsByEstablishment.remove(establishmentId, jobId);
        }
    }

    public MiningStatus getStatus(String jobId) {
        return jobs.getOrDefault(jobId, new MiningStatus(JobState.FAILED, "Job não encontrado.", 0));
    }
}
