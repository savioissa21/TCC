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
}
