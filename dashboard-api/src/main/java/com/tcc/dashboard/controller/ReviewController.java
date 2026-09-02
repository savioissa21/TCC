package com.tcc.dashboard.controller;

import com.tcc.dashboard.exception.UnauthorizedException;
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
        if (auth == null || !(auth.getPrincipal() instanceof User user)) {
            throw new UnauthorizedException("Autenticação necessária para acessar este recurso.");
        }
        return user.getEmail();
    }

    @GetMapping("/reviews")
    public ResponseEntity<List<Review>> getAllReviews() {
        String userEmail = getCurrentUserEmail();
        return ResponseEntity.ok(reviewService.getByUserEmail(userEmail));
    }

    @GetMapping("/reviews/establishment/{establishmentId}")
    public ResponseEntity<List<Review>> getByEstablishment(@PathVariable Long establishmentId) {
        String userEmail = getCurrentUserEmail();
        return ResponseEntity.ok(reviewService.getByEstablishmentId(establishmentId, userEmail));
    }
}
