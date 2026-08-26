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
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class EstablishmentService {

    private static final Pattern GOOGLE_DOMAIN = Pattern.compile(
            "(^|.*\\.)google\\.[a-z]{2,3}(\\.[a-z]{2})?$");
    private static final Pattern MARKDOWN_LINK = Pattern.compile(
            "^\\[[^\\]]*]\\((https?://.+)\\)$",
            Pattern.CASE_INSENSITIVE);

    @Autowired
    private EstablishmentRepository establishmentRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ReviewRepository reviewRepository;

    public Establishment createEstablishment(String name, String url, String userEmail) {
        String normalizedUrl = normalizeAndValidateMapsUrl(url);

        User owner = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new NotFoundException("Usuário não encontrado: " + userEmail));

        Establishment establishment = new Establishment();
        establishment.setName(name);
        establishment.setMapsUrl(normalizedUrl);
        establishment.setOwner(owner);
        establishment.setAutomaticUpdatesEnabled(true);

        return establishmentRepository.save(establishment);
    }

    static String normalizeAndValidateMapsUrl(String url) {
        if (url == null || url.isBlank()) {
            throw new BadRequestException("Informe o link de um estabelecimento específico no Google Maps.");
        }

        String normalizedUrl = normalizeMapsUrlInput(url);
        final URI uri;
        try {
            uri = URI.create(normalizedUrl);
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("O link informado não é uma URL válida do Google Maps.");
        }

        String scheme = uri.getScheme();
        if (scheme == null || !(scheme.equalsIgnoreCase("https") || scheme.equalsIgnoreCase("http"))) {
            throw new BadRequestException("O link informado não é uma URL válida do Google Maps.");
        }

        String host = uri.getHost();
        String normalizedHost = host == null ? "" : host.toLowerCase(Locale.ROOT);
        String path = uri.getPath();
        String normalizedPath = path == null ? "" : path.toLowerCase(Locale.ROOT);

        boolean isModernShortLink = normalizedHost.equals("maps.app.goo.gl");
        boolean isLegacyShortLink = normalizedHost.equals("goo.gl")
                && normalizedPath.startsWith("/maps/");
        if (isModernShortLink || isLegacyShortLink) {
            if (normalizedPath.length() <= 1 || normalizedPath.equals("/maps/")) {
                throw new BadRequestException(
                        "O link encurtado do Google Maps está incompleto. No aplicativo, abra o estabelecimento e use Compartilhar > Copiar link.");
            }
            return normalizedUrl;
        }

        if (!GOOGLE_DOMAIN.matcher(normalizedHost).matches()) {
            throw new BadRequestException(
                    "Informe um link do Google Maps, como maps.app.goo.gl ou google.com/maps/place/...");
        }

        if (normalizedPath.equals("/maps/search") || normalizedPath.contains("/maps/search/")) {
            throw new BadRequestException(
                    "Links de pesquisa do Google Maps não são aceitos. Selecione um estabelecimento específico e copie o link da página da empresa.");
        }

        boolean hasNamedPlace = normalizedPath.contains("/maps/place/")
                && !normalizedPath.endsWith("/maps/place/");
        String query = uri.getRawQuery();
        String normalizedQuery = query == null ? "" : query.toLowerCase(Locale.ROOT);
        boolean hasPlaceIdentifier = normalizedQuery.contains("cid=")
                || normalizedQuery.contains("query_place_id=")
                || normalizedQuery.contains("q=place_id%3a")
                || normalizedQuery.contains("q=place_id:");

        if (!hasNamedPlace && !hasPlaceIdentifier) {
            throw new BadRequestException(
                    "Esse link não identifica um estabelecimento específico. Abra a empresa no Google Maps e use Compartilhar > Copiar link.");
        }

        return normalizedUrl;
    }

    private static String normalizeMapsUrlInput(String value) {
        String normalized = value.trim()
                .replace("\\_", "_")
                .replace("\\&", "&");

        Matcher markdownLink = MARKDOWN_LINK.matcher(normalized);
        if (markdownLink.matches()) {
            normalized = markdownLink.group(1).trim();
        } else if (normalized.startsWith("<") && normalized.endsWith(">")) {
            normalized = normalized.substring(1, normalized.length() - 1).trim();
        }

        String lowerCaseUrl = normalized.toLowerCase(Locale.ROOT);
        if (lowerCaseUrl.startsWith("maps.app.goo.gl/")
                || lowerCaseUrl.startsWith("goo.gl/maps/")
                || lowerCaseUrl.startsWith("www.google.")
                || lowerCaseUrl.startsWith("maps.google.")) {
            normalized = "https://" + normalized;
        }

        return normalized;
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
                    satisfactionScore,
                    !Boolean.FALSE.equals(est.getAutomaticUpdatesEnabled()),
                    est.getLastMiningAt(),
                    est.getLastMiningSuccessAt(),
                    est.getNextMiningAt(),
                    est.getLastNewReviews() == null ? 0 : est.getLastNewReviews(),
                    est.getLastMiningStatus(),
                    est.getLastMiningMessage());
        }).toList();
    }

    public Establishment getOwnedEstablishment(Long id, String userEmail) {
        Establishment establishment = establishmentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Estabelecimento não encontrado."));
        if (!establishment.getOwner().getEmail().equals(userEmail)) {
            throw new UnauthorizedException("Acesso negado: você não é o dono deste estabelecimento.");
        }
        return establishment;
    }

    public Establishment setAutomaticUpdates(Long id, boolean enabled, String userEmail) {
        Establishment establishment = getOwnedEstablishment(id, userEmail);
        establishment.setAutomaticUpdatesEnabled(enabled);
        if (enabled && establishment.getNextMiningAt() == null) {
            establishment.setNextMiningAt(LocalDateTime.now());
        }
        return establishmentRepository.save(establishment);
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
