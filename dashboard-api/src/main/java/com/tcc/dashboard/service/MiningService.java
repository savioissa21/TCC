package com.tcc.dashboard.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tcc.dashboard.exception.BadRequestException;
import com.tcc.dashboard.exception.NotFoundException;
import com.tcc.dashboard.model.Aspect;
import com.tcc.dashboard.model.Establishment;
import com.tcc.dashboard.model.Review;
import com.tcc.dashboard.repository.EstablishmentRepository;
import com.tcc.dashboard.repository.ReviewRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.Sort;
import java.util.stream.Collectors;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.ArrayDeque;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Map;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class MiningService {

    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private EstablishmentRepository establishmentRepository;

    @Value("${mining.python.executable:python}")
    private String pythonExec;

    @Value("${mining.python.script.path}")
    private String scriptPath;

    @Value("${mining.output.file:dados_temp.json}")
    private String outputFile;

    @Value("${mining.schedule.interval:PT168H}")
    private Duration updateInterval;

    @Value("${mining.schedule.retry-interval:PT24H}")
    private Duration retryInterval;

    public int startMining(String url, Long establishmentId) {
        Establishment establishment = establishmentRepository.findById(establishmentId)
                .orElseThrow(() -> new NotFoundException(
                        "Estabelecimento com ID " + establishmentId + " não encontrado."));

        File jsonFile = null;
        markRunning(establishment);

        try {
            System.out.println("Iniciando mineração para: " + establishment.getName());

            File script = new File(scriptPath);
            if (!script.isFile()) {
                throw new BadRequestException("Script do minerador não encontrado em: " + script.getAbsolutePath());
            }

            String prefix = outputFile.replaceFirst("(?i)\\.json$", "");
            jsonFile = Files.createTempFile(script.getParentFile().toPath(), prefix + "-", ".json").toFile();

            ProcessBuilder pb = new ProcessBuilder(pythonExec, script.getAbsolutePath(), url);
            pb.directory(script.getParentFile());
            pb.redirectErrorStream(true);
            pb.environment().put("PYTHONUNBUFFERED", "1");
            pb.environment().put("MINING_OUTPUT_FILE", jsonFile.getAbsolutePath());

            Process process = pb.start();
            String miningError = null;
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    System.out.println("[PYTHON]: " + line);
                    if (line.startsWith("[MINING_ERROR] ")) {
                        miningError = line.substring("[MINING_ERROR] ".length());
                    }
                }
            }

            int exitCode = process.waitFor();
            if (exitCode != 0) {
                if (miningError != null) {
                    throw new BadRequestException(miningError);
                }
                throw new BadRequestException("Script Python falhou com código de saída: " + exitCode);
            }

            if (!jsonFile.isFile()) {
                throw new BadRequestException("O minerador não gerou o arquivo de resultado.");
            }

            ObjectMapper mapper = new ObjectMapper();
            List<Review> reviews = mapper.readValue(jsonFile, new TypeReference<List<Review>>() {});
            ensureReviewsFound(reviews);

            int imported = importNewReviews(establishment, reviews);
            int skipped = reviews.size() - imported;
            markCompleted(establishment, imported, skipped);
            System.out.println("Sucesso: " + imported + " avaliações novas e " + skipped
                    + " já conhecidas para: " + establishment.getName());
            return imported;

        } catch (Exception e) {
            System.err.println("Erro no MiningService: " + e.getMessage());
            markFailed(establishment, e.getMessage());
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            if (e instanceof RuntimeException runtimeException) {
                throw runtimeException;
            }
            throw new RuntimeException("Falha na mineração: " + e.getMessage(), e);
        } finally {
            if (jsonFile != null) {
                try {
                    Files.deleteIfExists(jsonFile.toPath());
                } catch (Exception cleanupError) {
                    System.err.println("Não foi possível remover o arquivo temporário: " + cleanupError.getMessage());
                }
            }
        }
    }

    private record ImportCandidate(Review review, String googleId, String databaseId, String fingerprint) {}

    int importNewReviews(Establishment establishment, List<Review> collectedReviews) {
        Long establishmentId = establishment.getId();
        List<ImportCandidate> candidates = collectedReviews.stream().map(review -> {
            String googleId = originalGoogleId(review);
            String fingerprint = reviewFingerprint(review);
            String databaseId = googleId != null ? googleDatabaseId(establishmentId, googleId)
                    : stableDatabaseId(establishmentId,
                            review.getId() == null || review.getId().isBlank() ? fingerprint : review.getId());
            return new ImportCandidate(review, googleId, databaseId, fingerprint);
        }).sorted(Comparator.comparing(candidate -> candidate.googleId() == null)).toList();

        Set<String> candidateIds = candidates.stream().map(ImportCandidate::databaseId).collect(Collectors.toSet());
        Map<String, Long> fingerprintLimits = candidates.stream().filter(c -> c.googleId() != null)
                .collect(Collectors.groupingBy(ImportCandidate::fingerprint, Collectors.counting()));
        Set<String> anonymousFingerprints = candidates.stream().filter(c -> c.googleId() == null)
                .map(ImportCandidate::fingerprint).collect(Collectors.toSet());
        Set<String> existingIds = new HashSet<>();
        Set<String> existingAnonymousFingerprints = new HashSet<>();
        Map<String, String> exactLegacyIds = new HashMap<>();
        Map<String, ArrayDeque<String>> legacyIdsByFingerprint = new HashMap<>();

        // Retain only candidate matches. Reserve exact IDs before considering legacy fingerprints.
        PageRequest page = PageRequest.of(0, 500, Sort.by("id"));
        Slice<Review> existing;
        do {
            existing = reviewRepository.findByEstablishmentId(establishmentId, page);
            for (Review stored : existing) {
                String googleId = originalGoogleId(stored);
                String identity = googleId == null ? stored.getId() : googleDatabaseId(establishmentId, googleId);
                boolean exact = candidateIds.contains(identity);
                if (exact) {
                    existingIds.add(identity);
                    if (googleId == null) exactLegacyIds.put(identity, stored.getId());
                }
                String fingerprint = reviewFingerprint(stored);
                if (anonymousFingerprints.contains(fingerprint)) existingAnonymousFingerprints.add(fingerprint);
                if (googleId == null && !exact && fingerprintLimits.containsKey(fingerprint)) {
                    var matches = legacyIdsByFingerprint.computeIfAbsent(fingerprint, ignored -> new ArrayDeque<>());
                    if (matches.size() < fingerprintLimits.get(fingerprint)) matches.add(stored.getId());
                }
            }
            page = page.next();
        } while (existing.hasNext());

        List<Review> newReviews = new ArrayList<>();
        Set<String> idsInBatch = new HashSet<>();
        Set<String> fingerprintsInBatch = new HashSet<>();
        LocalDateTime collectedAt = LocalDateTime.now();

        for (ImportCandidate candidate : candidates) {
            if (!idsInBatch.add(candidate.databaseId())) continue;
            if (existingIds.contains(candidate.databaseId())) {
                if (candidate.googleId() != null && exactLegacyIds.containsKey(candidate.databaseId())) {
                    reviewRepository.assignGoogleReviewId(exactLegacyIds.get(candidate.databaseId()),
                            establishmentId, candidate.googleId());
                }
                continue;
            }

            if (candidate.googleId() != null) {
                // A legacy row can represent at most one original Google ID.
                var matches = legacyIdsByFingerprint.get(candidate.fingerprint());
                boolean promoted = false;
                while (matches != null && !matches.isEmpty() && !promoted) {
                    promoted = reviewRepository.assignGoogleReviewId(matches.removeFirst(),
                            establishmentId, candidate.googleId()) == 1;
                }
                if (promoted) continue;
            } else if (existingAnonymousFingerprints.contains(candidate.fingerprint())
                    || fingerprintsInBatch.contains(candidate.fingerprint())) {
                continue;
            }

            Review review = candidate.review();
            review.setId(candidate.databaseId());
            review.setGoogleReviewId(candidate.googleId());
            review.setEstablishment(establishment);
            review.setCollectedAt(collectedAt);
            if (review.getAnalysisDate() == null || review.getAnalysisDate().isBlank()) {
                review.setAnalysisDate(collectedAt.toString());
            }
            if (review.getAspects() != null) {
                for (Aspect aspect : review.getAspects()) aspect.setReview(review);
            }
            newReviews.add(review);
            fingerprintsInBatch.add(candidate.fingerprint());
        }

        if (!newReviews.isEmpty()) reviewRepository.saveAll(newReviews);
        return newReviews.size();
    }

    private static String originalGoogleId(Review review) {
        String id = review.getGoogleReviewId();
        return id == null || id.isBlank() ? null : id.trim();
    }

    // Preserve the keys produced by the previous Python SHA-256 + establishment hash.
    static String googleDatabaseId(Long establishmentId, String googleId) {
        return stableDatabaseId(establishmentId, sha256(googleId));
    }

    static String stableDatabaseId(Long establishmentId, String sourceId) {
        return sha256(establishmentId + "|" + sourceId);
    }

    private static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Não foi possível gerar o identificador da avaliação.", e);
        }
    }

    static String reviewFingerprint(Review review) {
        return String.join("|",
                normalize(review.getAuthor()),
                review.getRating() == null ? "" : review.getRating().toString(),
                normalize(review.getText()));
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }

    private void markRunning(Establishment establishment) {
        LocalDateTime now = LocalDateTime.now();
        establishment.setLastMiningAt(now);
        establishment.setLastMiningStatus("RUNNING");
        establishment.setLastMiningMessage("Coleta em andamento.");
        establishmentRepository.save(establishment);
    }

    private void markCompleted(Establishment establishment, int imported, int skipped) {
        LocalDateTime now = LocalDateTime.now();
        establishment.setLastMiningSuccessAt(now);
        establishment.setNextMiningAt(now.plus(updateInterval));
        establishment.setLastNewReviews(imported);
        establishment.setLastMiningStatus("COMPLETED");
        establishment.setLastMiningMessage(imported + " novas; " + skipped + " já conhecidas.");
        establishmentRepository.save(establishment);
    }

    private void markFailed(Establishment establishment, String message) {
        establishment.setNextMiningAt(LocalDateTime.now().plus(retryInterval));
        establishment.setLastNewReviews(0);
        establishment.setLastMiningStatus("FAILED");
        String safeMessage = message == null ? "Falha desconhecida na coleta." : message;
        establishment.setLastMiningMessage(
                safeMessage.length() > 1000 ? safeMessage.substring(0, 1000) : safeMessage);
        establishmentRepository.save(establishment);
    }

    static void ensureReviewsFound(List<Review> reviews) {
        if (reviews.isEmpty()) {
            throw new BadRequestException(
                    "Nenhuma avaliação foi encontrada. Selecione um estabelecimento específico no Google Maps e use o link da página da empresa, não um link /maps/search/.");
        }
    }
}
