package com.tcc.dashboard.repository;

import com.tcc.dashboard.model.Establishment;
import com.tcc.dashboard.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EstablishmentRepository extends JpaRepository<Establishment, Long> {
    List<Establishment> findByOwner(User owner);
    List<Establishment> findByOwnerEmail(String email);

    @Query("select e from Establishment e where e.automaticUpdatesEnabled is null or e.automaticUpdatesEnabled = true")
    List<Establishment> findAllWithAutomaticUpdatesEnabled();

    interface Summary {
        Long getId();
        String getName();
        String getMapsUrl();
        Boolean getAutomaticUpdatesEnabled();
        java.time.LocalDateTime getLastMiningAt();
        java.time.LocalDateTime getLastMiningSuccessAt();
        java.time.LocalDateTime getNextMiningAt();
        Integer getLastNewReviews();
        String getLastMiningStatus();
        String getLastMiningMessage();
        long getReviewCount();
        double getAvgRating();
        long getPositiveCount();
    }

    @Query("""
            select e.id as id,
                   e.name as name,
                   e.mapsUrl as mapsUrl,
                   e.automaticUpdatesEnabled as automaticUpdatesEnabled,
                   e.lastMiningAt as lastMiningAt,
                   e.lastMiningSuccessAt as lastMiningSuccessAt,
                   e.nextMiningAt as nextMiningAt,
                   e.lastNewReviews as lastNewReviews,
                   e.lastMiningStatus as lastMiningStatus,
                   e.lastMiningMessage as lastMiningMessage,
                   count(r) as reviewCount,
                   coalesce(avg(coalesce(r.rating, 0.0)), 0.0) as avgRating,
                   coalesce(sum(case when r.overallSentiment = 'Positivo' then 1 else 0 end), 0) as positiveCount
            from Establishment e left join e.reviews r
            where e.owner.email = :email
            group by e.id, e.name, e.mapsUrl, e.automaticUpdatesEnabled, e.lastMiningAt, e.lastMiningSuccessAt, e.nextMiningAt, e.lastNewReviews, e.lastMiningStatus, e.lastMiningMessage
            order by e.id
            """)
    List<Summary> summarizeByOwner(@org.springframework.data.repository.query.Param("email") String email);
}
