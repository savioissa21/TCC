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

    // Self-injection com @Lazy para evitar ciclo de dependência
    // Necessário para que @Async funcione (chamada deve passar pelo proxy Spring)
    @Autowired
    @Lazy
    private MiningJobService self;

    public enum JobState { RUNNING, COMPLETED, FAILED }

    public record MiningStatus(JobState state, String message, int reviewsImported) {}

    private final Map<String, MiningStatus> jobs = new ConcurrentHashMap<>();

    public String startJob(Long establishmentId, String url) {
        String jobId = UUID.randomUUID().toString();
        jobs.put(jobId, new MiningStatus(JobState.RUNNING, "Iniciando mineração...", 0));
        // Chama via 'self' para passar pelo proxy do Spring e ativar @Async
        self.runMiningAsync(jobId, establishmentId, url);
        return jobId;
    }

    @Async
    public void runMiningAsync(String jobId, Long establishmentId, String url) {
        try {
            jobs.put(jobId, new MiningStatus(JobState.RUNNING, "Abrindo Google Maps e coletando avaliações...", 0));
            int count = miningService.startMining(url, establishmentId);
            jobs.put(jobId, new MiningStatus(JobState.COMPLETED, "Mineração concluída com sucesso!", count));
        } catch (Exception e) {
            jobs.put(jobId, new MiningStatus(JobState.FAILED, "Erro: " + e.getMessage(), 0));
        }
    }

    public MiningStatus getStatus(String jobId) {
        return jobs.getOrDefault(jobId, new MiningStatus(JobState.FAILED, "Job não encontrado.", 0));
    }
}
