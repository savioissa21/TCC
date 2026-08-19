package com.tcc.dashboard.service;

import com.tcc.dashboard.model.Establishment;
import com.tcc.dashboard.repository.EstablishmentRepository;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@ConditionalOnProperty(name = "mining.schedule.enabled", havingValue = "true", matchIfMissing = true)
public class ScheduledMiningService {

    private final EstablishmentRepository establishmentRepository;
    private final MiningJobService miningJobService;

    public ScheduledMiningService(
            EstablishmentRepository establishmentRepository,
            MiningJobService miningJobService) {
        this.establishmentRepository = establishmentRepository;
        this.miningJobService = miningJobService;
    }

    @Scheduled(
            fixedDelayString = "${mining.schedule.poll-delay-ms:3600000}",
            initialDelayString = "${mining.schedule.initial-delay-ms:60000}")
    public void enqueueDueUpdates() {
        LocalDateTime now = LocalDateTime.now();
        for (Establishment establishment : establishmentRepository.findAllWithAutomaticUpdatesEnabled()) {
            if (establishment.getNextMiningAt() == null || !establishment.getNextMiningAt().isAfter(now)) {
                try {
                    miningJobService.startJob(establishment.getId(), establishment.getMapsUrl());
                } catch (Exception error) {
                    System.err.println("Falha ao agendar atualização de " + establishment.getName()
                            + ": " + error.getMessage());
                }
            }
        }
    }
}
