package com.tcc.dashboard.service;

import com.tcc.dashboard.exception.NotFoundException;
import com.tcc.dashboard.model.Establishment;
import com.tcc.dashboard.model.MiningJob;
import com.tcc.dashboard.model.MiningJobState;
import com.tcc.dashboard.model.User;
import com.tcc.dashboard.repository.EstablishmentRepository;
import com.tcc.dashboard.repository.MiningJobRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.Executor;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MiningJobServiceTest {

    @Mock
    private MiningService miningService;
    @Mock
    private MiningJobRepository miningJobRepository;
    @Mock
    private EstablishmentRepository establishmentRepository;

    private Establishment establishment;

    @BeforeEach
    void setUp() {
        User owner = new User("Owner", "owner@example.com", "hash");
        establishment = new Establishment("Loja", "https://maps.app.goo.gl/example");
        establishment.setId(7L);
        establishment.setOwner(owner);
    }

    @Test
    void persistsQueuedRunningAndCompletedStates() {
        AtomicReference<MiningJob> persisted = configureRepository();
        when(miningService.startMining(establishment.getMapsUrl(), 7L)).thenReturn(4);
        MiningJobService service = service(Runnable::run);

        String jobId = service.startJob(7L, establishment.getMapsUrl());

        assertEquals(jobId, persisted.get().getId());
        assertEquals(MiningJobState.COMPLETED, persisted.get().getState());
        assertEquals(4, persisted.get().getReviewsImported());
        assertEquals("QUEUED", establishment.getLastMiningStatus());
        assertNotNull(persisted.get().getStartedAt());
        assertNotNull(persisted.get().getFinishedAt());
    }

    @Test
    void queueRejectionMarksJobFailedAndDoesNotBlockANewAttempt() {
        AtomicReference<MiningJob> persisted = configureRepository();
        Executor rejectingExecutor = task -> { throw new RejectedExecutionException("internal queue detail"); };
        MiningJobService service = service(rejectingExecutor);

        String firstJobId = service.startJob(7L, establishment.getMapsUrl());
        assertEquals(MiningJobState.FAILED, persisted.get().getState());
        assertEquals("A fila de mineração está cheia. Tente atualizar novamente em alguns minutos.",
                persisted.get().getMessage());
        assertEquals("FAILED", establishment.getLastMiningStatus());
        verify(miningService, never()).startMining(anyString(), any());

        String secondJobId = service.startJob(7L, establishment.getMapsUrl());
        assertNotEquals(firstJobId, secondJobId);
    }

    @Test
    void returnsStatusOnlyWhenJobBelongsToAuthenticatedOwner() {
        MiningJob job = job(MiningJobState.RUNNING);
        when(miningJobRepository.findOwnedJob("job-1", "owner@example.com"))
                .thenReturn(Optional.of(job));
        MiningJobService service = service(Runnable::run);

        var status = service.getStatus("job-1", "owner@example.com");

        assertEquals(MiningJobState.RUNNING, status.state());
        when(miningJobRepository.findOwnedJob("job-1", "intruder@example.com"))
                .thenReturn(Optional.empty());
        assertThrows(NotFoundException.class,
                () -> service.getStatus("job-1", "intruder@example.com"));
    }

    @Test
    void resumesUnfinishedJobsAfterApplicationRestart() {
        MiningJob interrupted = job(MiningJobState.RUNNING);
        interrupted.setStartedAt(LocalDateTime.now().minusMinutes(2));
        when(miningJobRepository.findByStateInOrderByCreatedAtAsc(any())).thenReturn(List.of(interrupted));
        when(miningJobRepository.findById("job-1")).thenReturn(Optional.of(interrupted));
        when(miningService.startMining(establishment.getMapsUrl(), 7L)).thenReturn(1);
        MiningJobService service = service(Runnable::run);

        service.recoverInterruptedJobs();

        assertEquals(MiningJobState.COMPLETED, interrupted.getState());
        assertEquals(1, interrupted.getReviewsImported());
        assertNotNull(interrupted.getFinishedAt());
    }

    private AtomicReference<MiningJob> configureRepository() {
        AtomicReference<MiningJob> persisted = new AtomicReference<>();
        when(miningJobRepository.findFirstByEstablishmentIdAndStateInOrderByCreatedAtDesc(eq(7L), any()))
                .thenReturn(Optional.empty());
        when(establishmentRepository.findById(7L)).thenReturn(Optional.of(establishment));
        when(miningJobRepository.saveAndFlush(any(MiningJob.class))).thenAnswer(invocation -> {
            persisted.set(invocation.getArgument(0));
            return persisted.get();
        });
        when(miningJobRepository.findById(anyString())).thenAnswer(invocation ->
                Optional.ofNullable(persisted.get()));
        when(miningJobRepository.save(any(MiningJob.class))).thenAnswer(invocation -> invocation.getArgument(0));
        return persisted;
    }

    private MiningJobService service(Executor executor) {
        MiningJobService service = new MiningJobService(
                miningService, miningJobRepository, establishmentRepository, executor);
        ReflectionTestUtils.setField(service, "retryInterval", Duration.ofHours(1));
        return service;
    }

    private MiningJob job(MiningJobState state) {
        MiningJob job = new MiningJob();
        job.setId("job-1");
        job.setEstablishment(establishment);
        job.setState(state);
        job.setMessage("Em andamento");
        job.setCreatedAt(LocalDateTime.now().minusMinutes(2));
        job.setUpdatedAt(LocalDateTime.now());
        return job;
    }
}
