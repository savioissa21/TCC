package com.tcc.dashboard.service;

import com.tcc.dashboard.dto.ReviewDTO;
import com.tcc.dashboard.model.Review;
import com.tcc.dashboard.repository.ReviewRepository;
import com.tcc.dashboard.exception.UnauthorizedException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReviewServiceTest {
    @Mock private ReviewRepository reviewRepository;
    @Mock private EstablishmentService establishmentService;
    @InjectMocks private ReviewService reviewService;

    @Test
    void preservesDatabaseOrderAndBoundsPageSize() {
        Review first = new Review(); first.setId("first");
        Review second = new Review(); second.setId("second");
        var bounded = PageRequest.of(2, 100);
        when(reviewRepository.findPageIds("owner@example.com", 7L, "Positivo", "Ana", bounded))
                .thenReturn(new PageImpl<>(List.of("first", "second"), bounded, 202));
        when(reviewRepository.findPageWithAspects(List.of("first", "second"), "owner@example.com"))
                .thenReturn(List.of(second, first));

        Page<ReviewDTO> result = reviewService.getByEstablishmentId(7L, "owner@example.com",
                "Positivo", " Ana ", PageRequest.of(2, 1000));

        assertEquals(List.of("first", "second"), result.map(ReviewDTO::id).getContent());
        assertEquals(202, result.getTotalElements());
        assertEquals(100, result.getSize());
        verify(establishmentService).getOwnedEstablishment(7L, "owner@example.com");
    }

    @Test
    void doesNotFetchAspectsForEmptyPage() {
        var page = PageRequest.of(0, 8);
        when(reviewRepository.findPageIds("owner@example.com", null, "", "", page))
                .thenReturn(Page.empty(page));
        assertTrue(reviewService.getByUserEmail("owner@example.com", "", "", page).isEmpty());
        verify(reviewRepository, never()).findPageWithAspects(any(), any());
    }

    @Test
    void doesNotReturnReviewsWhenEstablishmentBelongsToAnotherUser() {
        doThrow(new UnauthorizedException("Acesso negado."))
                .when(establishmentService).getOwnedEstablishment(7L, "intruder@example.com");
        assertThrows(UnauthorizedException.class, () -> reviewService.getByEstablishmentId(
                7L, "intruder@example.com", "", "", PageRequest.of(0, 8)));
        verifyNoInteractions(reviewRepository);
    }
}
