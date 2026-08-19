package com.tcc.dashboard.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonManagedReference;

@Entity
public class Establishment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(length = 1000)
    private String mapsUrl; // O link que o Python vai usar

    private Boolean automaticUpdatesEnabled = true;
    private LocalDateTime lastMiningAt;
    private LocalDateTime lastMiningSuccessAt;
    private LocalDateTime nextMiningAt;
    private Integer lastNewReviews = 0;
    private String lastMiningStatus;

    @Column(length = 1000)
    private String lastMiningMessage;

    // RELACIONAMENTO: Um estabelecimento tem VÁRIAS reviews
    @OneToMany(mappedBy = "establishment", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    private List<Review> reviews = new ArrayList<>();

    @ManyToOne
    @JoinColumn(name = "owner_id", nullable = false)
    @JsonIgnore // Importante: Não mandar a senha do dono no JSON do estabelecimento
    private User owner;

    public Establishment() {
    }

    public Establishment(String name, String mapsUrl) {
        this.name = name;
        this.mapsUrl = mapsUrl;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getMapsUrl() {
        return mapsUrl;
    }

    public void setMapsUrl(String mapsUrl) {
        this.mapsUrl = mapsUrl;
    }

    public Boolean getAutomaticUpdatesEnabled() {
        return automaticUpdatesEnabled;
    }

    public void setAutomaticUpdatesEnabled(Boolean automaticUpdatesEnabled) {
        this.automaticUpdatesEnabled = automaticUpdatesEnabled;
    }

    public LocalDateTime getLastMiningAt() {
        return lastMiningAt;
    }

    public void setLastMiningAt(LocalDateTime lastMiningAt) {
        this.lastMiningAt = lastMiningAt;
    }

    public LocalDateTime getLastMiningSuccessAt() {
        return lastMiningSuccessAt;
    }

    public void setLastMiningSuccessAt(LocalDateTime lastMiningSuccessAt) {
        this.lastMiningSuccessAt = lastMiningSuccessAt;
    }

    public LocalDateTime getNextMiningAt() {
        return nextMiningAt;
    }

    public void setNextMiningAt(LocalDateTime nextMiningAt) {
        this.nextMiningAt = nextMiningAt;
    }

    public Integer getLastNewReviews() {
        return lastNewReviews;
    }

    public void setLastNewReviews(Integer lastNewReviews) {
        this.lastNewReviews = lastNewReviews;
    }

    public String getLastMiningStatus() {
        return lastMiningStatus;
    }

    public void setLastMiningStatus(String lastMiningStatus) {
        this.lastMiningStatus = lastMiningStatus;
    }

    public String getLastMiningMessage() {
        return lastMiningMessage;
    }

    public void setLastMiningMessage(String lastMiningMessage) {
        this.lastMiningMessage = lastMiningMessage;
    }

    public List<Review> getReviews() {
        return reviews;
    }

    public void setReviews(List<Review> reviews) {
        this.reviews = reviews;
    }

    public User getOwner() {
        return owner;
    }

    public void setOwner(User owner) {
        this.owner = owner;
    }
}
