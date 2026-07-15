package com.tcc.dashboard.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.tcc.dashboard.model.Review;

import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, String> {
    List<Review> findByEstablishmentId(Long establishmentId);
    List<Review> findByEstablishment_Owner_Email(String email);
}
