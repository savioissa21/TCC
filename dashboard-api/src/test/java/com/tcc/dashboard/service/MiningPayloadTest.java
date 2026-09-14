package com.tcc.dashboard.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tcc.dashboard.exception.BadRequestException;
import com.tcc.dashboard.model.Establishment;
import com.tcc.dashboard.repository.EstablishmentRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MiningPayloadTest {
    @TempDir Path temp;

    private MiningService.MiningPayload parse(String json) throws Exception {
        Path file = temp.resolve("result.json");
        Files.writeString(file, json);
        return MiningService.parsePayload(new ObjectMapper(), file.toFile());
    }

    @Test void acceptsLegacyAndCompleteReports() throws Exception {
        assertFalse(parse("[{\"author\":\"Ana\"}]").partial());
        var payload = parse("{\"reviews\":[{\"author\":\"Ana\"}],\"collectionWarnings\":[]}");
        assertFalse(payload.partial());
        assertEquals("Ana", payload.reviews().getFirst().getAuthor());
    }

    @Test void preservesReviewsAndPartialStatusWithoutExposingRawWarningText() throws Exception {
        var payload = parse("{\"reviews\":[{\"author\":\"Ana\"}],\"collectionWarnings\":[\"SORT_UNCONFIRMED\"]}");
        assertTrue(payload.partial());
        assertEquals(1, payload.reviews().size());
    }

    @Test void rejectsMalformedReportInsteadOfClaimingCompleteness() {
        assertThrows(BadRequestException.class, () -> parse("{\"reviews\":[],\"collectionWarnings\":\"broken\"}"));
        assertThrows(BadRequestException.class, () -> parse("{\"collectionWarnings\":[]}"));
    }

    @Test void partialImportSchedulesEarlierRetryAndKeepsPersistentWarning() {
        MiningService service = new MiningService();
        EstablishmentRepository repository = mock(EstablishmentRepository.class);
        ReflectionTestUtils.setField(service, "establishmentRepository", repository);
        ReflectionTestUtils.setField(service, "retryInterval", Duration.ofHours(24));
        ReflectionTestUtils.setField(service, "updateInterval", Duration.ofDays(7));
        Establishment store = new Establishment();
        ReflectionTestUtils.invokeMethod(service, "markCompleted", store, 5, 0, true);
        assertEquals("COMPLETED", store.getLastMiningStatus());
        assertTrue(store.getLastMiningMessage().startsWith("Coleta parcial:"));
        assertEquals(Duration.ofHours(24), Duration.between(store.getLastMiningSuccessAt(), store.getNextMiningAt()));
        verify(repository).save(store);
    }
}
