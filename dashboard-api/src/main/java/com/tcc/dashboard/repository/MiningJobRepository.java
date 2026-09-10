package com.tcc.dashboard.repository;

import com.tcc.dashboard.model.MiningJob;
import com.tcc.dashboard.model.MiningJobState;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface MiningJobRepository extends JpaRepository<MiningJob, String> {

    Optional<MiningJob> findFirstByEstablishmentIdAndStateInOrderByCreatedAtDesc(
            Long establishmentId, Collection<MiningJobState> states);

    @EntityGraph(attributePaths = {"establishment", "establishment.owner"})
    List<MiningJob> findByStateInOrderByCreatedAtAsc(Collection<MiningJobState> states);

    @Query("""
            select j from MiningJob j
            join fetch j.establishment e
            join fetch e.owner o
            where j.id = :jobId and lower(o.email) = lower(:email)
            """)
    Optional<MiningJob> findOwnedJob(@Param("jobId") String jobId, @Param("email") String email);
}
