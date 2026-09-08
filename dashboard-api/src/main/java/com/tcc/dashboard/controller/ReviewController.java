package com.tcc.dashboard.controller;

import com.tcc.dashboard.exception.UnauthorizedException;
import com.tcc.dashboard.dto.PageResponse;
import com.tcc.dashboard.dto.ReviewDTO;
import com.tcc.dashboard.dto.ReviewStatsDTO;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import com.tcc.dashboard.model.User;
import com.tcc.dashboard.service.ReviewService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;


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
    public ResponseEntity<PageResponse<ReviewDTO>> getAllReviews(
            @RequestParam(defaultValue = "") String sentiment,
            @RequestParam(defaultValue = "") String search,
            @PageableDefault(size = 8) Pageable pageable) {
        return ResponseEntity.ok(PageResponse.from(
                reviewService.getByUserEmail(getCurrentUserEmail(), sentiment, search, pageable)));
    }

    @GetMapping("/reviews/stats")
    public ResponseEntity<ReviewStatsDTO> getStats() {
        return ResponseEntity.ok(reviewService.getStats(getCurrentUserEmail()));
    }

    @GetMapping("/reviews/establishment/{establishmentId}")
    public ResponseEntity<PageResponse<ReviewDTO>> getByEstablishment(@PathVariable Long establishmentId,
            @RequestParam(defaultValue = "") String sentiment,
            @RequestParam(defaultValue = "") String search,
            @PageableDefault(size = 8) Pageable pageable) {
        return ResponseEntity.ok(PageResponse.from(reviewService.getByEstablishmentId(
                establishmentId, getCurrentUserEmail(), sentiment, search, pageable)));
    }
}
