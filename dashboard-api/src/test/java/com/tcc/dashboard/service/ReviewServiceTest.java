package com.tcc.dashboard.service;

import com.tcc.dashboard.model.Review;
import com.tcc.dashboard.repository.ReviewRepository;
import com.tcc.dashboard.exception.UnauthorizedException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReviewServiceTest {

    @Mock
    private ReviewRepository reviewRepository;

    @Mock
    private EstablishmentService establishmentService;

    @InjectMocks
    private ReviewService reviewService;

    @Test
    void returnsNewlyCollectedReviewsBeforeLegacyRecords() {
        Review legacy = review("legacy", null);
        Review older = review("older", LocalDateTime.of(2026, 8, 1, 10, 0));
        Review newest = review("newest", LocalDateTime.of(2026, 8, 19, 10, 0));
        when(reviewRepository.findByEstablishmentId(7L)).thenReturn(List.of(legacy, older, newest));

        List<Review> result = reviewService.getByEstablishmentId(7L, "owner@example.com");

        assertEquals(List.of("newest", "older", "legacy"),
                result.stream().map(Review::getId).toList());
        verify(establishmentService).getOwnedEstablishment(7L, "owner@example.com");
    }

    @Test
    void doesNotReturnReviewsWhenEstablishmentBelongsToAnotherUser() {
        doThrow(new UnauthorizedException("Acesso negado."))
                .when(establishmentService).getOwnedEstablishment(7L, "intruder@example.com");

        assertThrows(UnauthorizedException.class,
                () -> reviewService.getByEstablishmentId(7L, "intruder@example.com"));

        verifyNoInteractions(reviewRepository);
    }

    private static Review review(String id, LocalDateTime collectedAt) {
        Review review = new Review();
        review.setId(id);
        review.setCollectedAt(collectedAt);
        return review;
    }
}
