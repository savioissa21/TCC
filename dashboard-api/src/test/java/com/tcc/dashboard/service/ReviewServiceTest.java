package com.tcc.dashboard.service;

import com.tcc.dashboard.model.Review;
import com.tcc.dashboard.repository.ReviewRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReviewServiceTest {

    @Mock
    private ReviewRepository reviewRepository;

    @InjectMocks
    private ReviewService reviewService;

    @Test
    void returnsNewlyCollectedReviewsBeforeLegacyRecords() {
        Review legacy = review("legacy", null);
        Review older = review("older", LocalDateTime.of(2026, 8, 1, 10, 0));
        Review newest = review("newest", LocalDateTime.of(2026, 8, 19, 10, 0));
        when(reviewRepository.findByEstablishmentId(7L)).thenReturn(List.of(legacy, older, newest));

        List<Review> result = reviewService.getByEstablishmentId(7L);

        assertEquals(List.of("newest", "older", "legacy"),
                result.stream().map(Review::getId).toList());
    }

    private static Review review(String id, LocalDateTime collectedAt) {
        Review review = new Review();
        review.setId(id);
        review.setCollectedAt(collectedAt);
        return review;
    }
}
