package com.tcc.dashboard.controller;

import com.tcc.dashboard.dto.ReviewDTO;
import com.tcc.dashboard.model.Review;
import com.tcc.dashboard.model.User;
import com.tcc.dashboard.exception.UnauthorizedException;
import com.tcc.dashboard.service.ReviewService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReviewControllerTest {
    @Mock private ReviewService reviewService;
    @InjectMocks private ReviewController reviewController;

    @AfterEach void clearSecurityContext() { SecurityContextHolder.clearContext(); }

    @Test
    void scopesEstablishmentReviewsAndForwardsFiltersAndPagination() {
        User user = new User("Owner", "owner@example.com", "password");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, List.of()));
        var page = PageRequest.of(1, 8);
        var reviews = List.of(ReviewDTO.from(new Review()));
        when(reviewService.getByEstablishmentId(7L, "owner@example.com", "Positivo", "Ana", page))
                .thenReturn(new PageImpl<>(reviews, page, 9));
        var response = reviewController.getByEstablishment(7L, "Positivo", "Ana", page).getBody();
        assertNotNull(response);
        assertEquals(reviews, response.content());
        assertEquals(9, response.totalElements());
        assertEquals(1, response.number());
    }

    @Test
    void rejectsRequestWithoutAuthenticatedUser() {
        assertThrows(UnauthorizedException.class,
                () -> reviewController.getByEstablishment(7L, "", "", PageRequest.of(0, 8)));
        assertThrows(UnauthorizedException.class, () -> reviewController.getStats());
        assertThrows(UnauthorizedException.class,
                () -> reviewController.getAllReviews("", "", PageRequest.of(0, 8)));
        verifyNoInteractions(reviewService);
    }
}
