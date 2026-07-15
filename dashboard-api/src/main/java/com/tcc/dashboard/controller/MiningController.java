package com.tcc.dashboard.controller;

import com.tcc.dashboard.service.MiningJobService;
import com.tcc.dashboard.service.MiningJobService.MiningStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/mining")
@CrossOrigin(origins = "*")
public class MiningController {

    @Autowired
    private MiningJobService miningJobService;

    @GetMapping("/status/{jobId}")
    public ResponseEntity<MiningStatus> getStatus(@PathVariable String jobId) {
        return ResponseEntity.ok(miningJobService.getStatus(jobId));
    }
}
