package com.tcc.dashboard.dto;

import com.tcc.dashboard.model.Aspect;
import java.util.List;

// Usando 'record', você não precisa criar getters e setters manuais
public record ReviewDTO(
    String id,
    String author,
    String text,
    Double rating,
    String date,
    String source,
    Double sentimentScore,
    String overallSentiment,
    List<Aspect> aspects
) {}