package com.tcc.dashboard.exception;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void shouldReturnNotFoundStatusForNotFoundExceptions() {
        ResponseEntity<Map<String, Object>> response = handler
                .handleApiException(new NotFoundException("Usuário não encontrado"));

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals("Usuário não encontrado", response.getBody().get("error"));
    }

    @Test
    void shouldNotExposeUnexpectedRuntimeExceptionDetails() {
        ResponseEntity<Map<String, Object>> response = handler
                .handleRuntimeException(new RuntimeException("jdbc:postgresql://internal/secret"));

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertEquals("Erro interno no servidor. Tente novamente.", response.getBody().get("error"));
        assertFalse(response.getBody().toString().contains("postgresql"));
        assertFalse(response.getBody().containsKey("detail"));
    }
}
