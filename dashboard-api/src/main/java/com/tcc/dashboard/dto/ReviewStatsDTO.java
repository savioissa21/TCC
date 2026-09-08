package com.tcc.dashboard.dto;

import java.util.List;

public record ReviewStatsDTO(long total, long positive, long negative, long neutral,
        double avgRating, long score, List<AspectStat> aspects) {
    public record AspectStat(String name, long positive, long negative, long neutral,
            long total, long score) {}
}
