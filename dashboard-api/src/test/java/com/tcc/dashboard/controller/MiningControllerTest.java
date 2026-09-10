package com.tcc.dashboard.controller;

import com.tcc.dashboard.exception.UnauthorizedException;
import com.tcc.dashboard.model.MiningJobState;
import com.tcc.dashboard.model.User;
import com.tcc.dashboard.service.MiningJobService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MiningControllerTest {

    @Mock
    private MiningJobService miningJobService;

    @InjectMocks
    private MiningController controller;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void passesAuthenticatedOwnerToStatusLookup() {
        User owner = new User("Owner", "owner@example.com", "hash");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(owner, null, List.of()));
        var status = new MiningJobService.MiningStatus(
                MiningJobState.RUNNING, "Coletando", 0, LocalDateTime.now());
        when(miningJobService.getStatus("job-1", "owner@example.com")).thenReturn(status);

        var response = controller.getStatus("job-1");

        assertEquals(status, response.getBody());
        verify(miningJobService).getStatus("job-1", "owner@example.com");
    }

    @Test
    void rejectsStatusLookupWithoutAuthenticatedUser() {
        assertThrows(UnauthorizedException.class, () -> controller.getStatus("job-1"));
    }
}
