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
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.SliceImpl;
import org.springframework.data.domain.Sort;

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

        when(reviewRepository.findByEstablishmentId(7L, PageRequest.of(0, 500, Sort.by("id")))).thenReturn(new SliceImpl<>(List.of(legacyReview)));
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
        when(reviewRepository.findByEstablishmentId(7L, PageRequest.of(0, 500, Sort.by("id")))).thenReturn(new SliceImpl<>(List.of(existing)));

        assertEquals(0, miningService.importNewReviews(establishment, List.of(incoming)));
        verify(reviewRepository, never()).saveAll(anyList());
    }

    @Test
    void checksLaterHistoryPagesBeforeSaving() {
        Establishment establishment = establishment(7L);
        var first = PageRequest.of(0, 500, Sort.by("id"));
        Review unrelated = review("old", "Other", 1.0, "Outro texto");
        Review known = review("legacy", "Ana", 5.0, "Ótimo atendimento");
        Review incoming = review("google-1", "Ana", 5.0, "  ótimo   atendimento ");
        when(reviewRepository.findByEstablishmentId(7L, first))
                .thenReturn(new SliceImpl<>(List.of(unrelated), first, true));
        when(reviewRepository.findByEstablishmentId(7L, first.next()))
                .thenReturn(new SliceImpl<>(List.of(known), first.next(), false));

        assertEquals(0, miningService.importNewReviews(establishment, List.of(incoming)));
        verify(reviewRepository).findByEstablishmentId(7L, first.next());
        verify(reviewRepository, never()).saveAll(anyList());
    }

    @Test
    void scopesStableIdsByEstablishment() {
        assertNotEquals(
                MiningService.stableDatabaseId(1L, "google-review"),
                MiningService.stableDatabaseId(2L, "google-review"));
    }


    @Test
    void keepsIdenticalContentWithDifferentOriginalIdsInTheSameBatch() {
        history();
        Review first = googleReview("google-1", "Ana", 5.0, "Bom");
        Review second = googleReview("google-2", "Ana", 5.0, "Bom");
        assertEquals(2, miningService.importNewReviews(establishment(7L), List.of(first, second)));
        assertNotEquals(first.getId(), second.getId());
        assertEquals("google-1", first.getGoogleReviewId());
        assertEquals("google-2", second.getGoogleReviewId());
    }

    @Test
    void keepsIdenticalContentWhenStoredReviewHasAnotherOriginalId() {
        Review stored = googleReview("google-1", "Ana", 5.0, "Bom");
        stored.setId(MiningService.googleDatabaseId(7L, "google-1"));
        history(stored);
        Review incoming = googleReview("google-2", "Ana", 5.0, "Bom");
        assertEquals(1, miningService.importNewReviews(establishment(7L), List.of(incoming)));
    }

    @Test
    void skipsRepeatedOriginalIdEvenWhenContentAndTransportIdChanged() {
        Review stored = googleReview("google-1", "Ana", 5.0, "Bom");
        stored.setId("legacy-key-retained-after-promotion");
        history(stored);
        Review incoming = googleReview("google-1", "Novo nome", 1.0, "Editado");
        incoming.setId("different-transport-id");
        assertEquals(0, miningService.importNewReviews(establishment(7L), List.of(incoming)));
        verify(reviewRepository, never()).saveAll(anyList());
    }

    @Test
    void skipsRepeatedOriginalIdWithinTheBatchEvenAfterAnEdit() {
        history();
        Review first = googleReview("google-1", "Ana", 5.0, "Bom");
        Review edited = googleReview("google-1", "Ana", 1.0, "Editado");
        assertEquals(1, miningService.importNewReviews(establishment(7L), List.of(first, edited)));
    }

    @Test
    void promotesEachLegacyReviewToOnlyOneOriginalId() {
        history(review("legacy", "Ana", 5.0, "Bom"));
        when(reviewRepository.assignGoogleReviewId("legacy", 7L, "google-1")).thenReturn(1);
        Review first = googleReview("google-1", "Ana", 5.0, "Bom");
        Review second = googleReview("google-2", "Ana", 5.0, "Bom");
        assertEquals(1, miningService.importNewReviews(establishment(7L), List.of(first, second)));
        verify(reviewRepository).assignGoogleReviewId("legacy", 7L, "google-1");
        verify(reviewRepository, never()).assignGoogleReviewId("legacy", 7L, "google-2");
        assertEquals(MiningService.googleDatabaseId(7L, "google-2"), second.getId());
    }

    @Test
    void reservesExactLegacyIdBeforeFingerprintMatchingAnotherOriginalId() {
        String legacyId = MiningService.googleDatabaseId(7L, "google-2");
        history(review(legacyId, "Ana", 5.0, "Bom"));
        Review first = googleReview("google-1", "Ana", 5.0, "Bom");
        Review second = googleReview("google-2", "Ana", 5.0, "Bom");
        assertEquals(1, miningService.importNewReviews(establishment(7L), List.of(first, second)));
        verify(reviewRepository).assignGoogleReviewId(legacyId, 7L, "google-2");
        verify(reviewRepository, never()).assignGoogleReviewId(legacyId, 7L, "google-1");
    }

    @Test
    void usesFingerprintForMissingIdsAfterPrioritizingIdentifiedReviews() {
        history();
        Review anonymous = review(null, "Ana", 5.0, "  BOM ");
        Review blank = review(" ", "Ana", 5.0, "bom");
        blank.setGoogleReviewId(" ");
        Review first = googleReview("google-1", "Ana", 5.0, "Bom");
        Review second = googleReview("google-2", "Ana", 5.0, "Bom");
        assertEquals(2, miningService.importNewReviews(establishment(7L),
                List.of(anonymous, blank, first, second)));
    }

    @Test
    void deduplicatesMissingIdsAgainstStoredIdentifiedContent() {
        history(googleReview("google-1", "Ana", 5.0, "Bom"));
        assertEquals(0, miningService.importNewReviews(establishment(7L),
                List.of(review(null, "Ana", 5.0, "  BOM "))));
    }

    @Test
    void keepsDifferentMissingIdContentAndDeduplicatesEqualFingerprints() {
        history();
        assertEquals(2, miningService.importNewReviews(establishment(7L), List.of(
                review(null, "Ana", 5.0, "Bom"),
                review(" ", "Ana", 5.0, "  BOM "),
                review(null, "Ana", 4.0, "Bom"))));
    }

    private void history(Review... reviews) {
        when(reviewRepository.findByEstablishmentId(7L, PageRequest.of(0, 500, Sort.by("id"))))
                .thenReturn(new SliceImpl<>(List.of(reviews)));
    }

    private static Review googleReview(String googleId, String author, Double rating, String text) {
        Review review = review("transport-" + googleId, author, rating, text);
        review.setGoogleReviewId(googleId);
        return review;
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
