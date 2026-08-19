package com.tcc.dashboard.service;

import java.util.List;
import java.util.Comparator;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.tcc.dashboard.model.Review;
import com.tcc.dashboard.repository.ReviewRepository;

@Service
public class ReviewService {

    private static final Comparator<Review> MOST_RECENT_FIRST = Comparator.comparing(
            Review::getCollectedAt,
            Comparator.nullsLast(Comparator.reverseOrder()));

    @Autowired
    private ReviewRepository reviewRepository;

    public List<Review> getAllReviews() {
        return sortMostRecentFirst(reviewRepository.findAll());
    }

    public List<Review> getByEstablishmentId(Long establishmentId) {
        return sortMostRecentFirst(reviewRepository.findByEstablishmentId(establishmentId));
    }

    public List<Review> getByUserEmail(String email) {
        return sortMostRecentFirst(reviewRepository.findByEstablishment_Owner_Email(email));
    }

    public void saveAll(List<Review> reviews) {
        reviewRepository.saveAll(reviews);
    }

    private List<Review> sortMostRecentFirst(List<Review> reviews) {
        return reviews.stream().sorted(MOST_RECENT_FIRST).toList();
    }
}
