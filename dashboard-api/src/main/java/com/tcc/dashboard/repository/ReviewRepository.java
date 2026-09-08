package com.tcc.dashboard.repository;

import com.tcc.dashboard.model.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Collection;
import java.util.List;

public interface ReviewRepository extends JpaRepository<Review, String> {
    Slice<Review> findByEstablishmentId(Long establishmentId, Pageable pageable);

    // Page IDs without joining a collection: LIMIT/OFFSET stays in the database.
    @Query(value = """
            select r.id from Review r
            where r.establishment.owner.email = :email
              and (:establishmentId is null or r.establishment.id = :establishmentId)
              and (:sentiment = '' or r.overallSentiment = :sentiment)
              and (:search = '' or locate(lower(:search), lower(coalesce(r.text, ''))) > 0
                   or locate(lower(:search), lower(coalesce(r.author, ''))) > 0)
            order by r.collectedAt desc nulls last, r.id desc
            """, countQuery = """
            select count(r) from Review r
            where r.establishment.owner.email = :email
              and (:establishmentId is null or r.establishment.id = :establishmentId)
              and (:sentiment = '' or r.overallSentiment = :sentiment)
              and (:search = '' or locate(lower(:search), lower(coalesce(r.text, ''))) > 0
                   or locate(lower(:search), lower(coalesce(r.author, ''))) > 0)
            """)
    Page<String> findPageIds(@Param("email") String email,
            @Param("establishmentId") Long establishmentId, @Param("sentiment") String sentiment,
            @Param("search") String search, Pageable pageable);

    @Query("""
            select distinct r from Review r left join fetch r.aspects
            where r.id in :ids and r.establishment.owner.email = :email
            """)
    List<Review> findPageWithAspects(@Param("ids") Collection<String> ids, @Param("email") String email);

    // Promote legacy identity without merging detached lazy collections.
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Modifying
    @Query("""
            update Review r set r.googleReviewId = :googleReviewId
            where r.id = :id and r.establishment.id = :establishmentId
              and (r.googleReviewId is null or trim(r.googleReviewId) = '')
            """)
    int assignGoogleReviewId(@Param("id") String id, @Param("establishmentId") Long establishmentId,
            @Param("googleReviewId") String googleReviewId);

    interface Totals {
        long getTotal();
        long getPositive();
        long getNegative();
        long getNeutral();
        double getAvgRating();
    }

    @Query("""
            select count(r) as total,
                   coalesce(sum(case when r.overallSentiment = 'Positivo' then 1 else 0 end), 0) as positive,
                   coalesce(sum(case when r.overallSentiment = 'Negativo' then 1 else 0 end), 0) as negative,
                   coalesce(sum(case when r.overallSentiment = 'Neutro' then 1 else 0 end), 0) as neutral,
                   coalesce(avg(coalesce(r.rating, 0.0)), 0.0) as avgRating
            from Review r where r.establishment.owner.email = :email
            """)
    Totals aggregateByOwner(@Param("email") String email);

    interface AspectTotals {
        String getName();
        long getPositive();
        long getNegative();
        long getNeutral();
        long getTotal();
    }

    @Query("""
            select a.name as name, count(a) as total,
                   sum(case when a.sentiment = 'Positivo' then 1 else 0 end) as positive,
                   sum(case when a.sentiment = 'Negativo' then 1 else 0 end) as negative,
                   sum(case when a.sentiment in ('Positivo', 'Negativo') then 0 else 1 end) as neutral
            from Aspect a where a.review.establishment.owner.email = :email
            group by a.name order by count(a) desc, a.name asc
            """)
    List<AspectTotals> aggregateAspectsByOwner(@Param("email") String email);
}
