package com.tcc.dashboard.controller;

import com.tcc.dashboard.model.Review;
import com.tcc.dashboard.model.User;
import com.tcc.dashboard.service.ReviewService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ReviewController {

    @Autowired
    private ReviewService reviewService;

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = (User) auth.getPrincipal();
        return user.getEmail();
    }

    @GetMapping("/reviews")
    public ResponseEntity<List<Review>> getAllReviews() {
        String userEmail = getCurrentUserEmail();
        return ResponseEntity.ok(reviewService.getByUserEmail(userEmail));
    }

    @GetMapping("/reviews/establishment/{establishmentId}")
    public ResponseEntity<List<Review>> getByEstablishment(@PathVariable Long establishmentId) {
        return ResponseEntity.ok(reviewService.getByEstablishmentId(establishmentId));
    }
}
