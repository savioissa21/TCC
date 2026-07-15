package com.tcc.dashboard.repository;

import com.tcc.dashboard.model.Establishment;
import com.tcc.dashboard.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EstablishmentRepository extends JpaRepository<Establishment, Long> {
    List<Establishment> findByOwner(User owner);
    List<Establishment> findByOwnerEmail(String email);
}
