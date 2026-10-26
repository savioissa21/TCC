package com.tcc.dashboard.dto;

import java.time.LocalDateTime;

public record EstablishmentSummaryDTO(
    Long id,
    String name,
    String mapsUrl,
    long reviewCount,
    double avgRating,
    Double googleRating,
    Long googleReviewCount,
    LocalDateTime googleRatingUpdatedAt,
    double satisfactionScore,
    boolean automaticUpdatesEnabled,
    LocalDateTime lastMiningAt,
    LocalDateTime lastMiningSuccessAt,
    LocalDateTime nextMiningAt,
    int lastNewReviews,
    String lastMiningStatus,
    String lastMiningMessage
) {}
