package com.tcc.dashboard.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;

@Entity
@Table(indexes = @Index(name = "idx_review_establishment", columnList = "establishment_id"))
public class Review {

    @Id
    private String id; // ID que vem do Python/UUID

    private String author;

    @Column(length = 5000)
    private String text;

    private Double rating;
    private String date;
    private String source;

    // --- NOVOS CAMPOS DA INTELIGÊNCIA (IA) ---
    private Double sentimentScore;
    private String overallSentiment;
    private String analysisDate;
    private LocalDateTime collectedAt;

    // Relacionamento: Uma review tem Vários aspectos
    @OneToMany(mappedBy = "review", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    @JsonManagedReference // Gerencia a serialização do JSON
    private List<Aspect> aspects = new ArrayList<>();

    @ManyToOne
    @JoinColumn(name = "establishment_id") // Cria a coluna de chave estrangeira
    @JsonBackReference // Evita loop infinito no JSON
    private Establishment establishment;

    public Review() {
    }

    // Método auxiliar para adicionar aspecto e já vincular
    public void addAspect(Aspect aspect) {
        aspects.add(aspect);
        aspect.setReview(this);
    }

    // --- Getters e Setters (Para Todos os Campos) ---
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getAuthor() {
        return author;
    }

    public void setAuthor(String author) {
        this.author = author;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public Double getRating() {
        return rating;
    }

    public void setRating(Double rating) {
        this.rating = rating;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public Double getSentimentScore() {
        return sentimentScore;
    }

    public void setSentimentScore(Double sentimentScore) {
        this.sentimentScore = sentimentScore;
    }

    public String getOverallSentiment() {
        return overallSentiment;
    }

    public void setOverallSentiment(String overallSentiment) {
        this.overallSentiment = overallSentiment;
    }

    public String getAnalysisDate() {
        return analysisDate;
    }

    public void setAnalysisDate(String analysisDate) {
        this.analysisDate = analysisDate;
    }

    public LocalDateTime getCollectedAt() {
        return collectedAt;
    }

    public void setCollectedAt(LocalDateTime collectedAt) {
        this.collectedAt = collectedAt;
    }

    public List<Aspect> getAspects() {
        return aspects;
    }

    public void setAspects(List<Aspect> aspects) {
        this.aspects = aspects;
    }

    public Establishment getEstablishment() {
        return establishment;
    }

    public void setEstablishment(Establishment establishment) {
        this.establishment = establishment;
    }
}
