package com.tcc.dashboard.dto;

import com.tcc.dashboard.model.Review;
import java.time.LocalDateTime;
import java.util.List;

public record ReviewDTO(String id, String author, String text, Double rating, String date,
        String source, Double sentimentScore, String overallSentiment, String analysisDate,
        LocalDateTime collectedAt, List<AspectDTO> aspects) {
    public record AspectDTO(Long id, String name, String sentiment, String excerpt) {}

    public static ReviewDTO from(Review review) {
        return new ReviewDTO(review.getId(), review.getAuthor(), review.getText(), review.getRating(),
                review.getDate(), review.getSource(), review.getSentimentScore(),
                review.getOverallSentiment(), review.getAnalysisDate(), review.getCollectedAt(),
                review.getAspects().stream().map(a -> new AspectDTO(
                        a.getId(), a.getName(), a.getSentiment(), a.getExcerpt())).toList());
    }
}
