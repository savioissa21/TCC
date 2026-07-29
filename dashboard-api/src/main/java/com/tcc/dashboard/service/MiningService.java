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

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.util.List;

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

    public int startMining(String url, Long establishmentId) {
        Establishment establishment = establishmentRepository.findById(establishmentId)
                .orElseThrow(() -> new NotFoundException("Estabelecimento com ID " + establishmentId + " não encontrado."));

        try {
            System.out.println("Iniciando mineração para: " + establishment.getName());

            File script = new File(scriptPath);
            ProcessBuilder pb = new ProcessBuilder(pythonExec, script.getAbsolutePath(), url);
            pb.directory(script.getParentFile());
            pb.redirectErrorStream(true);
            pb.environment().put("PYTHONUNBUFFERED", "1");

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

            File jsonFile = new File(script.getParentFile(), outputFile);
            if (!jsonFile.exists()) {
                throw new BadRequestException("Arquivo '" + outputFile + "' não foi gerado pelo Python.");
            }

            ObjectMapper mapper = new ObjectMapper();
            List<Review> reviews = mapper.readValue(jsonFile, new TypeReference<List<Review>>() {});

            ensureReviewsFound(reviews);

            for (Review review : reviews) {
                review.setEstablishment(establishment);
                if (review.getAspects() != null) {
                    for (Aspect aspect : review.getAspects()) {
                        aspect.setReview(review);
                    }
                }
            }

            if (!reviews.isEmpty()) {
                reviewRepository.saveAll(reviews);
                System.out.println("Sucesso: " + reviews.size() + " avaliações salvas para: " + establishment.getName());
            }

            return reviews.size();

        } catch (Exception e) {
            System.err.println("Erro no MiningService: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Falha na mineração: " + e.getMessage(), e);
        }
    }

    static void ensureReviewsFound(List<Review> reviews) {
        if (reviews.isEmpty()) {
            throw new BadRequestException(
                    "Nenhuma avaliação foi encontrada. Selecione um estabelecimento específico no Google Maps e use o link da página da empresa, não um link /maps/search/."
            );
        }
    }
}
