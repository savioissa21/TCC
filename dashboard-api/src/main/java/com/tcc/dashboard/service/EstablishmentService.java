package com.tcc.dashboard.service;

import com.tcc.dashboard.dto.EstablishmentSummaryDTO;
import com.tcc.dashboard.exception.BadRequestException;
import com.tcc.dashboard.exception.NotFoundException;
import com.tcc.dashboard.exception.UnauthorizedException;
import com.tcc.dashboard.model.Establishment;
import com.tcc.dashboard.model.Review;
import com.tcc.dashboard.model.User;
import com.tcc.dashboard.repository.EstablishmentRepository;
import com.tcc.dashboard.repository.ReviewRepository;
import com.tcc.dashboard.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.util.List;
import java.util.Locale;

@Service
public class EstablishmentService {

    @Autowired
    private EstablishmentRepository establishmentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ReviewRepository reviewRepository;

    public Establishment createEstablishment(String name, String url, String userEmail) {
        validateMapsUrl(url);

        User owner = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new NotFoundException("Usuário não encontrado: " + userEmail));

        Establishment establishment = new Establishment();
        establishment.setName(name);
        establishment.setMapsUrl(url);
        establishment.setOwner(owner);

        return establishmentRepository.save(establishment);
    }

    private void validateMapsUrl(String url) {
        if (url == null || url.isBlank()) {
            throw new BadRequestException("Informe o link de um estabelecimento específico no Google Maps.");
        }

        final URI uri;
        try {
            uri = URI.create(url.trim());
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("O link informado não é uma URL válida do Google Maps.");
        }

        String host = uri.getHost();
        String normalizedHost = host == null ? "" : host.toLowerCase(Locale.ROOT);
        boolean isGoogleHost = normalizedHost.matches("(^|.*\\.)google\\.[a-z]{2,3}(\\.[a-z]{2})?")
                || normalizedHost.contains("google")
                || normalizedHost.contains("maps.app.goo.gl");

        if (normalizedHost.contains("maps.app.goo.gl") || normalizedHost.contains("goo.gl")) {
            throw new BadRequestException(
                    "Links encurtados do Google Maps não são aceitos. Use o link completo da página do estabelecimento.");
        }

        if (!isGoogleHost) {
            throw new BadRequestException(
                    "Informe o link completo da página de um estabelecimento no Google Maps. Links genéricos ou encurtados não são aceitos.");
        }

        String path = uri.getPath();
        String normalizedPath = path == null ? "" : path.toLowerCase(Locale.ROOT);
        if (normalizedPath.equals("/maps/search") || normalizedPath.contains("/maps/search/")) {
            throw new BadRequestException(
                    "Links de pesquisa do Google Maps não são aceitos. Selecione um estabelecimento específico e copie o link da página da empresa.");
        }

        if (!normalizedPath.contains("/maps/place/")) {
            throw new BadRequestException(
                    "Esse link não identifica um estabelecimento específico. Abra a página da empresa no Google Maps e copie a URL completa, que deve conter /maps/place/.");
        }

        if (normalizedPath.equals("/maps/place/") || normalizedPath.equals("/maps/place")) {
            throw new BadRequestException(
                    "Esse link não identifica um estabelecimento específico. Abra a página da empresa no Google Maps e copie a URL completa, que deve conter /maps/place/.");
        }

        if (uri.getQuery() != null && !uri.getQuery().isBlank()) {
            throw new BadRequestException(
                    "Esse link não é um link direto de estabelecimento do Google Maps. Use a URL da página do estabelecimento sem parâmetros de compartilhamento.");
        }
    }

    public List<EstablishmentSummaryDTO> getSummaryByUser(String userEmail) {
        List<Establishment> establishments = establishmentRepository.findByOwnerEmail(userEmail);

        return establishments.stream().map(est -> {
            List<Review> reviews = reviewRepository.findByEstablishmentId(est.getId());

            long totalReviews = reviews.size();
            double avgRating = reviews.stream()
                    .mapToDouble(r -> r.getRating() != null ? r.getRating() : 0.0)
                    .average().orElse(0.0);
            long positiveCount = reviews.stream()
                    .filter(r -> "Positivo".equals(r.getOverallSentiment())).count();
            double satisfactionScore = totalReviews > 0
                    ? Math.round((double) positiveCount / totalReviews * 1000.0) / 10.0
                    : 0.0;

            return new EstablishmentSummaryDTO(
                    est.getId(),
                    est.getName(),
                    est.getMapsUrl(),
                    totalReviews,
                    Math.round(avgRating * 10.0) / 10.0,
                    satisfactionScore);
        }).toList();
    }

    public void deleteEstablishment(Long id, String userEmail) {
        Establishment est = establishmentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Estabelecimento não encontrado."));

        if (!est.getOwner().getEmail().equals(userEmail)) {
            throw new UnauthorizedException("Acesso negado: você não é o dono deste estabelecimento.");
        }

        establishmentRepository.delete(est);
    }
}
