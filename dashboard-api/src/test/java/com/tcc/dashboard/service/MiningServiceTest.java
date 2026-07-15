package com.tcc.dashboard.service;

import com.tcc.dashboard.model.Review;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class MiningServiceTest {

    @Test
    void treatsZeroReviewsAsFailure() {
        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> MiningService.ensureReviewsFound(List.of())
        );

        assertEquals(
                "Nenhuma avaliação foi encontrada. Selecione um estabelecimento específico no Google Maps e use o link da página da empresa, não um link /maps/search/.",
                exception.getMessage()
        );
    }

    @Test
    void acceptsNonEmptyReviewList() {
        assertDoesNotThrow(() -> MiningService.ensureReviewsFound(List.of(new Review())));
    }
}
