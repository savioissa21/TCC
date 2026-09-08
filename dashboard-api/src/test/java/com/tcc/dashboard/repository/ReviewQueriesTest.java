package com.tcc.dashboard.repository;

import com.tcc.dashboard.dto.ReviewDTO;
import com.tcc.dashboard.model.*;
import com.tcc.dashboard.service.EstablishmentService;
import com.tcc.dashboard.service.ReviewService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ReviewQueriesTest {
    @Autowired EntityManager em;
    @Autowired EntityManagerFactory emf;
    @Autowired ReviewService reviews;
    @Autowired EstablishmentService establishments;
    @Autowired ReviewRepository repository;
    private Establishment store;
    private Establishment empty;
    private Statistics statistics;

    @BeforeEach
    void seed() {
        User owner = new User("Owner", "owner@query.test", "password");
        User outsider = new User("Other", "other@query.test", "password");
        em.persist(owner); em.persist(outsider);
        store = store(owner, "Reviewed");
        empty = store(owner, "Empty");
        Establishment other = store(outsider, "Private");
        Review first = review(store, "b", 5.0, "Positivo", LocalDateTime.of(2026, 1, 2, 0, 0), "Ana", "100% bom");
        first.addAspect(new Aspect("Comida", "Positivo", "boa"));
        first.addAspect(new Aspect("Comida", null, "incerto"));
        em.persist(first);
        em.persist(review(store, "a", null, "Negativo", LocalDateTime.of(2026, 1, 2, 0, 0), "Bia", "ruim"));
        em.persist(review(store, "legacy", 4.0, "Neutro", null, "Caio", "ok"));
        em.persist(review(other, "private", 1.0, "Negativo", LocalDateTime.now(), "Ana", "100% privado"));
        em.flush(); em.clear();
        statistics = emf.unwrap(SessionFactory.class).getStatistics();
        statistics.clear();
    }

    @Test
    void summaryUsesOneAggregateQueryAndIncludesEmptyStores() {
        var summaries = establishments.getSummaryByUser("owner@query.test");
        assertEquals(2, summaries.size());
        var summary = summaries.stream().filter(s -> s.id().equals(store.getId())).findFirst().orElseThrow();
        assertEquals(3, summary.reviewCount());
        assertEquals(3.0, summary.avgRating());
        assertEquals(33.3, summary.satisfactionScore());
        var emptySummary = summaries.stream().filter(s -> s.id().equals(empty.getId())).findFirst().orElseThrow();
        assertEquals(0, emptySummary.reviewCount());
        assertEquals(0, emptySummary.avgRating());
        assertEquals(0, emptySummary.satisfactionScore());
        assertEquals(1, statistics.getPrepareStatementCount());
        assertEquals(0, statistics.getEntityLoadCount());
    }

    @Test
    void statsAggregateAllReviewsWithoutMultiplyingByAspectsOrIncludingOtherOwners() {
        var stats = reviews.getStats("owner@query.test");
        assertEquals(3, stats.total());
        assertEquals(1, stats.positive()); assertEquals(1, stats.negative()); assertEquals(1, stats.neutral());
        assertEquals(3.0, stats.avgRating()); assertEquals(33, stats.score());
        assertEquals(1, stats.aspects().size());
        assertEquals(2, stats.aspects().getFirst().total());
        assertEquals(1, stats.aspects().getFirst().neutral());
        assertEquals(50, stats.aspects().getFirst().score());
        assertEquals(2, statistics.getPrepareStatementCount());
        assertEquals(0, statistics.getEntityLoadCount());
    }

    @Test
    void pagesInDatabaseWithStableOrderAndLoadsOnlyCurrentPageAspects() {
        var first = reviews.getByUserEmail("owner@query.test", "", "", PageRequest.of(0, 2));
        assertEquals(List.of("b", "a"), first.map(ReviewDTO::id).getContent());
        assertEquals(3, first.getTotalElements());
        assertEquals(2, first.getTotalPages());
        assertEquals(2, first.getContent().getFirst().aspects().size());
        assertEquals(3, statistics.getPrepareStatementCount()); // IDs, count, page with aspects.
        assertEquals(4, statistics.getEntityLoadCount()); // Two reviews and two aspects.
        em.clear();
        assertTrue(first.getContent().getFirst().aspects().stream().anyMatch(a -> "boa".equals(a.excerpt())));
        var last = reviews.getByUserEmail("owner@query.test", "", "", PageRequest.of(1, 2));
        assertEquals(List.of("legacy"), last.map(ReviewDTO::id).getContent());
        assertTrue(last.isLast());
    }

    @Test
    void searchIsCaseInsensitiveLiteralAndCombinedWithSentiment() {
        var result = reviews.getByUserEmail("owner@query.test", "Positivo", "ANA", PageRequest.of(0, 8));
        assertEquals(List.of("b"), result.map(ReviewDTO::id).getContent());
        assertEquals(1, reviews.getByUserEmail("owner@query.test", "", "%", PageRequest.of(0, 8)).getTotalElements());
        assertEquals(0, reviews.getByUserEmail("owner@query.test", "Negativo", "ANA", PageRequest.of(0, 8)).getTotalElements());
    }

    @Test
    void emptyAndOutOfRangePagesKeepCorrectTotals() {
        assertEquals(0, reviews.getByUserEmail("nobody@query.test", "", "", PageRequest.of(0, 8)).getTotalElements());
        var beyond = reviews.getByUserEmail("owner@query.test", "", "", PageRequest.of(8, 2));
        assertTrue(beyond.isEmpty());
        assertEquals(3, beyond.getTotalElements());
        assertEquals(0, reviews.getStats("nobody@query.test").total());
        assertEquals(0, reviews.getStats("nobody@query.test").avgRating());
        assertTrue(establishments.getSummaryByUser("nobody@query.test").isEmpty());
    }

    @Test
    void establishmentScopeAndLazyAspectsAreRespected() {
        assertEquals(0, reviews.getByEstablishmentId(empty.getId(), "owner@query.test", "", "",
                PageRequest.of(0, 8)).getTotalElements());
        Review review = em.find(Review.class, "b");
        assertFalse(emf.getPersistenceUnitUtil().isLoaded(review, "aspects"));
    }

    private Establishment store(User owner, String name) {
        Establishment e = new Establishment(name, "https://maps.google.com/" + name);
        e.setOwner(owner); em.persist(e); return e;
    }

    private Review review(Establishment e, String id, Double rating, String sentiment,
            LocalDateTime collectedAt, String author, String text) {
        Review r = new Review();
        r.setId(id); r.setEstablishment(e); r.setRating(rating); r.setOverallSentiment(sentiment);
        r.setCollectedAt(collectedAt); r.setAuthor(author); r.setText(text); return r;
    }
}
