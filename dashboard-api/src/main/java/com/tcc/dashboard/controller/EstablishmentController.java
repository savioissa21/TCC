package com.tcc.dashboard.controller;

import com.tcc.dashboard.dto.EstablishmentSummaryDTO;
import com.tcc.dashboard.exception.UnauthorizedException;
import com.tcc.dashboard.model.Establishment;
import com.tcc.dashboard.model.User;
import com.tcc.dashboard.service.EstablishmentService;
import com.tcc.dashboard.service.MiningJobService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/establishments")
public class EstablishmentController {

    @Autowired
    private EstablishmentService establishmentService;

    @Autowired
    private MiningJobService miningJobService;

    public record CreateEstablishmentDTO(
            @NotBlank(message = "O nome do estabelecimento é obrigatório.")
            @Size(min = 2, max = 100, message = "O nome deve ter entre 2 e 100 caracteres.")
            String name,
            @NotBlank(message = "A URL do Google Maps é obrigatória.")
            @Size(max = 2000, message = "A URL do Google Maps é muito longa.")
            String url) {
    }

    public record AutomaticUpdatesDTO(@NotNull(message = "Informe se a atualização automática deve ficar ativa.")
            Boolean enabled) {
    }

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof User user)) {
            throw new UnauthorizedException("Autenticação necessária para acessar este recurso.");
        }
        return user.getEmail();
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(@Valid @RequestBody CreateEstablishmentDTO data) {
        String userEmail = getCurrentUserEmail();
        Establishment est = establishmentService.createEstablishment(data.name(), data.url(), userEmail);
        String jobId = miningJobService.startJob(est.getId(), est.getMapsUrl());
        return ResponseEntity.ok(Map.of("establishment", est, "jobId", jobId));
    }

    @GetMapping
    public ResponseEntity<List<EstablishmentSummaryDTO>> listMyEstablishments() {
        String userEmail = getCurrentUserEmail();
        return ResponseEntity.ok(establishmentService.getSummaryByUser(userEmail));
    }

    @PostMapping("/{id}/refresh")
    public ResponseEntity<Map<String, String>> refresh(@PathVariable Long id) {
        String userEmail = getCurrentUserEmail();
        Establishment establishment = establishmentService.getOwnedEstablishment(id, userEmail);
        String jobId = miningJobService.startJob(establishment.getId(), establishment.getMapsUrl());
        return ResponseEntity.ok(Map.of("jobId", jobId));
    }

    @PatchMapping("/{id}/automatic-updates")
    public ResponseEntity<Map<String, Boolean>> setAutomaticUpdates(
            @PathVariable Long id,
            @Valid @RequestBody AutomaticUpdatesDTO data) {
        String userEmail = getCurrentUserEmail();
        establishmentService.setAutomaticUpdates(id, data.enabled(), userEmail);
        return ResponseEntity.ok(Map.of("enabled", data.enabled()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        String userEmail = getCurrentUserEmail();
        establishmentService.deleteEstablishment(id, userEmail);
        return ResponseEntity.noContent().build();
    }
}
