package com.tcc.dashboard.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tcc.dashboard.model.Aspect;
import com.tcc.dashboard.model.Establishment;
import com.tcc.dashboard.model.Review;
import com.tcc.dashboard.model.User;
import com.tcc.dashboard.repository.ReviewRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class MiningIdentityIntegrationTest {
    @Autowired EntityManager em;
    @Autowired MiningService mining;
    @Autowired ReviewRepository repository;
    private Establishment store;

    @BeforeEach
    void setup() {
        User owner = new User("Owner", "identity@test.example", "password");
        em.persist(owner);
        store = new Establishment("Loja", "https://maps.google.com/");
        store.setOwner(owner); em.persist(store);
        em.flush(); em.clear();
    }

    @Test
    void preservesOriginalIdsAndDeduplicatesAcrossImportsAndEstablishments() {
        assertEquals(2, mining.importNewReviews(store, List.of(incoming("google-1"), incoming("google-2"))));
        em.flush(); em.clear();
        assertEquals(2, repository.count());
        assertEquals("google-1", em.find(Review.class,
                MiningService.googleDatabaseId(store.getId(), "google-1")).getGoogleReviewId());

        Review edited = incoming("google-1"); edited.setText("Editado"); edited.setRating(1.0);
        assertEquals(0, mining.importNewReviews(store, List.of(edited, incoming("google-2"))));
        assertEquals(1, mining.importNewReviews(store, List.of(incoming("google-3"))));
        em.flush(); em.clear();
        assertEquals(3, repository.count());

        Establishment other = new Establishment("Outra loja", "https://maps.google.com/other");
        other.setOwner(em.find(Establishment.class, store.getId()).getOwner());
        em.persist(other);
        assertEquals(1, mining.importNewReviews(other, List.of(incoming("google-1"))));
        em.flush();
        assertEquals(4, repository.count());
    }

    @Test
    void legacyPromotionPreservesAspectsAndStopsSuppressingOtherOriginalIds() {
        Review legacy = incoming(null);
        legacy.setId("old-uuid");
        legacy.setEstablishment(em.getReference(Establishment.class, store.getId()));
        LocalDateTime originalCollection = LocalDateTime.of(2025, 1, 1, 0, 0);
        legacy.setCollectedAt(originalCollection);
        legacy.addAspect(new Aspect("Comida", "Positivo", "Boa"));
        em.persist(legacy); em.flush(); em.clear();

        assertEquals(1, mining.importNewReviews(store, List.of(incoming("google-1"), incoming("google-2"))));
        em.flush(); em.clear();
        Review promoted = em.find(Review.class, "old-uuid");
        assertEquals("google-1", promoted.getGoogleReviewId());
        assertEquals(originalCollection, promoted.getCollectedAt());
        assertEquals(1, promoted.getAspects().size());
        assertEquals(2, repository.count());
        em.clear();
        assertEquals(0, mining.importNewReviews(store, List.of(incoming("google-1"), incoming("google-2"))));
        assertEquals(1, mining.importNewReviews(store, List.of(incoming("google-3"))));
        em.flush();
        assertEquals(3, repository.count());
    }

    @Test
    void promotesPreviousHashKeyByExactIdEvenWhenContentHasChanged() {
        Review legacy = incoming(null);
        legacy.setId(MiningService.googleDatabaseId(store.getId(), "google-1"));
        legacy.setEstablishment(em.getReference(Establishment.class, store.getId()));
        em.persist(legacy); em.flush(); em.clear();
        Review edited = incoming("google-1"); edited.setText("Texto editado");
        assertEquals(0, mining.importNewReviews(store, List.of(edited)));
        em.flush(); em.clear();
        assertEquals("google-1", em.find(Review.class, legacy.getId()).getGoogleReviewId());
        assertEquals(1, repository.count());
    }

    @Test
    void deserializesOriginalIdFromMinerJson() throws Exception {
        Review parsed = new ObjectMapper().readValue(
                "{\"id\":\"transport-hash\",\"googleReviewId\":\"google-1\",\"author\":\"Ana\",\"rating\":5.0,\"text\":\"Bom\"}",
                Review.class);
        assertEquals(1, mining.importNewReviews(store, List.of(parsed)));
        em.flush(); em.clear();
        assertEquals("google-1", em.find(Review.class, parsed.getId()).getGoogleReviewId());
    }

    private static Review incoming(String googleId) {
        Review review = new Review();
        review.setGoogleReviewId(googleId);
        review.setAuthor("Ana"); review.setRating(5.0); review.setText("Bom");
        return review;
    }
}
