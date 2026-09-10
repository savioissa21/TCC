package com.tcc.dashboard.controller;

import com.tcc.dashboard.service.MiningJobService;
import com.tcc.dashboard.service.MiningJobService.MiningStatus;
import com.tcc.dashboard.exception.UnauthorizedException;
import com.tcc.dashboard.model.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/mining")
public class MiningController {

    @Autowired
    private MiningJobService miningJobService;

    @GetMapping("/status/{jobId}")
    public ResponseEntity<MiningStatus> getStatus(@PathVariable String jobId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof User user)) {
            throw new UnauthorizedException("Autenticação necessária para acessar este recurso.");
        }
        return ResponseEntity.ok(miningJobService.getStatus(jobId, user.getEmail()));
    }
}
