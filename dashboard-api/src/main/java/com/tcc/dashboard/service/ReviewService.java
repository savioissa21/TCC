package com.tcc.dashboard.service;

import com.tcc.dashboard.dto.ReviewDTO;
import com.tcc.dashboard.dto.ReviewStatsDTO;
import com.tcc.dashboard.model.Review;
import com.tcc.dashboard.repository.ReviewRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class ReviewService {
    @Autowired
    private ReviewRepository reviewRepository;
    @Autowired
    private EstablishmentService establishmentService;

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Page<ReviewDTO> getByEstablishmentId(Long establishmentId, String userEmail,
            String sentiment, String search, Pageable pageable) {
        establishmentService.getOwnedEstablishment(establishmentId, userEmail);
        return getPage(userEmail, establishmentId, sentiment, search, pageable);
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Page<ReviewDTO> getByUserEmail(String email, String sentiment, String search, Pageable pageable) {
        return getPage(email, null, sentiment, search, pageable);
    }

    private Page<ReviewDTO> getPage(String email, Long establishmentId,
            String sentiment, String search, Pageable pageable) {
        // Keep a bounded page and a stable database order, including legacy null timestamps.
        Pageable bounded = PageRequest.of(pageable.isPaged() ? pageable.getPageNumber() : 0,
                pageable.isPaged() ? Math.min(pageable.getPageSize(), 100) : 8);
        Page<String> ids = reviewRepository.findPageIds(email, establishmentId,
                sentiment == null ? "" : sentiment.trim(), search == null ? "" : search.trim(), bounded);
        if (ids.isEmpty()) {
            return new PageImpl<>(List.of(), bounded, ids.getTotalElements());
        }
        var reviews = reviewRepository.findPageWithAspects(ids.getContent(), email).stream()
                .collect(Collectors.toMap(Review::getId, Function.identity()));
        return ids.map(id -> ReviewDTO.from(reviews.get(id)));
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public ReviewStatsDTO getStats(String email) {
        var totals = reviewRepository.aggregateByOwner(email);
        var aspects = reviewRepository.aggregateAspectsByOwner(email).stream()
                .map(a -> new ReviewStatsDTO.AspectStat(a.getName(), a.getPositive(), a.getNegative(),
                        a.getNeutral(), a.getTotal(), Math.round(100.0 * a.getPositive() / a.getTotal())))
                .toList();
        return new ReviewStatsDTO(totals.getTotal(), totals.getPositive(), totals.getNegative(),
                totals.getNeutral(), totals.getAvgRating(),
                totals.getTotal() == 0 ? 0 : Math.round(100.0 * totals.getPositive() / totals.getTotal()), aspects);
    }

    public void saveAll(List<Review> reviews) {
        reviewRepository.saveAll(reviews);
    }
}
