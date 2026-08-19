package com.tcc.dashboard.service;

import com.tcc.dashboard.model.Establishment;
import com.tcc.dashboard.model.Review;
import com.tcc.dashboard.repository.EstablishmentRepository;
import com.tcc.dashboard.repository.ReviewRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MiningServiceTest {

    @Mock
    private ReviewRepository reviewRepository;

    @Mock
    private EstablishmentRepository establishmentRepository;

    @InjectMocks
    private MiningService miningService;

    @Test
    void treatsZeroReviewsAsFailure() {
        RuntimeException exception = assertThrows(
                RuntimeException.class,
                () -> MiningService.ensureReviewsFound(List.of()));

        assertEquals(
                "Nenhuma avaliação foi encontrada. Selecione um estabelecimento específico no Google Maps e use o link da página da empresa, não um link /maps/search/.",
                exception.getMessage());
    }

    @Test
    void acceptsNonEmptyReviewList() {
        assertDoesNotThrow(() -> MiningService.ensureReviewsFound(List.of(new Review())));
    }

    @Test
    @SuppressWarnings("unchecked")
    void importsOnlyReviewsThatAreNotAlreadyStored() {
        Establishment establishment = establishment(7L);
        Review legacyReview = review("uuid-legado", "Ana", 5.0, "Ótimo atendimento");
        Review repeatedReview = review("google-1", "Ana", 5.0, "  ótimo   atendimento ");
        Review newReview = review("google-2", "Bia", 4.0, "Comida muito boa");

        when(reviewRepository.findByEstablishmentId(7L)).thenReturn(List.of(legacyReview));
        when(reviewRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

        int imported = miningService.importNewReviews(
                establishment,
                List.of(repeatedReview, newReview));

        assertEquals(1, imported);
        ArgumentCaptor<List<Review>> captor = ArgumentCaptor.forClass(List.class);
        verify(reviewRepository).saveAll(captor.capture());
        Review saved = captor.getValue().getFirst();
        assertEquals(MiningService.stableDatabaseId(7L, "google-2"), saved.getId());
        assertEquals(establishment, saved.getEstablishment());
        assertEquals("Bia", saved.getAuthor());
    }

    @Test
    void doesNotSaveWhenTheWholeBatchIsAlreadyKnown() {
        Establishment establishment = establishment(7L);
        Review existing = review("legacy", "Ana", 5.0, "Ótimo atendimento");
        Review incoming = review("google-1", "Ana", 5.0, "Ótimo atendimento");
        when(reviewRepository.findByEstablishmentId(7L)).thenReturn(List.of(existing));

        assertEquals(0, miningService.importNewReviews(establishment, List.of(incoming)));
        verify(reviewRepository, never()).saveAll(anyList());
    }

    @Test
    void scopesStableIdsByEstablishment() {
        assertNotEquals(
                MiningService.stableDatabaseId(1L, "google-review"),
                MiningService.stableDatabaseId(2L, "google-review"));
    }

    private static Establishment establishment(Long id) {
        Establishment establishment = new Establishment();
        establishment.setId(id);
        establishment.setName("Loja");
        return establishment;
    }

    private static Review review(String id, String author, Double rating, String text) {
        Review review = new Review();
        review.setId(id);
        review.setAuthor(author);
        review.setRating(rating);
        review.setText(text);
        return review;
    }
}
