package com.tcc.dashboard.exception;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void shouldReturnNotFoundStatusForNotFoundExceptions() {
        ResponseEntity<Map<String, Object>> response = handler
                .handleApiException(new NotFoundException("Usuário não encontrado"));

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals("Usuário não encontrado", response.getBody().get("error"));
    }
}
