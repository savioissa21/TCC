package com.tcc.dashboard.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.tcc.dashboard.model.Review;
import com.tcc.dashboard.repository.ReviewRepository;

@Service
public class ReviewService {

    @Autowired
    private ReviewRepository reviewRepository;

    public List<Review> getAllReviews() {
        return reviewRepository.findAll();
    }

    public List<Review> getByEstablishmentId(Long establishmentId) {
        return reviewRepository.findByEstablishmentId(establishmentId);
    }

    public List<Review> getByUserEmail(String email) {
        return reviewRepository.findByEstablishment_Owner_Email(email);
    }

    public void saveAll(List<Review> reviews) {
        reviewRepository.saveAll(reviews);
    }
}
