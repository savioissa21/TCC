package com.tcc.dashboard.service;

import com.tcc.dashboard.model.Establishment;
import com.tcc.dashboard.repository.EstablishmentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ScheduledMiningServiceTest {

    @Mock
    private EstablishmentRepository establishmentRepository;

    @Mock
    private MiningJobService miningJobService;

    @InjectMocks
    private ScheduledMiningService scheduledMiningService;

    @Test
    void enqueuesOnlyDueEstablishments() {
        Establishment due = establishment(1L, null);
        Establishment future = establishment(2L, LocalDateTime.now().plusDays(2));
        when(establishmentRepository.findAllWithAutomaticUpdatesEnabled())
                .thenReturn(List.of(due, future));

        scheduledMiningService.enqueueDueUpdates();

        verify(miningJobService).startJob(1L, due.getMapsUrl());
        verify(miningJobService, never()).startJob(2L, future.getMapsUrl());
    }

    private static Establishment establishment(Long id, LocalDateTime nextMiningAt) {
        Establishment establishment = new Establishment();
        establishment.setId(id);
        establishment.setName("Loja " + id);
        establishment.setMapsUrl("https://www.google.com/maps/place/Loja" + id);
        establishment.setNextMiningAt(nextMiningAt);
        return establishment;
    }
}
