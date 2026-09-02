package com.tcc.dashboard.controller;

import com.tcc.dashboard.exception.UnauthorizedException;
import com.tcc.dashboard.model.Review;
import com.tcc.dashboard.model.User;
import com.tcc.dashboard.service.ReviewService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReviewControllerTest {

    @Mock
    private ReviewService reviewService;

    @InjectMocks
    private ReviewController reviewController;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void scopesEstablishmentReviewsToAuthenticatedUser() {
        User user = new User("Owner", "owner@example.com", "password");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, List.of()));
        List<Review> reviews = List.of(new Review());
        when(reviewService.getByEstablishmentId(7L, "owner@example.com")).thenReturn(reviews);

        ResponseEntity<List<Review>> response = reviewController.getByEstablishment(7L);

        assertEquals(reviews, response.getBody());
        verify(reviewService).getByEstablishmentId(7L, "owner@example.com");
    }

    @Test
    void rejectsRequestWithoutAuthenticatedUser() {
        assertThrows(UnauthorizedException.class,
                () -> reviewController.getByEstablishment(7L));
        verifyNoInteractions(reviewService);
    }
}
