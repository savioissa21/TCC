package com.tcc.dashboard.exception;

import com.tcc.dashboard.dto.LoginRequestDTO;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import java.util.TreeMap;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        if (ex.getParameter().getParameterType() == LoginRequestDTO.class) {
            return invalidBody(LoginRequestDTO.INVALID_CREDENTIALS);
        }
        Map<String, String> errors = new TreeMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error ->
                errors.putIfAbsent(error.getField(), error.getDefaultMessage()));
        return ResponseEntity.badRequest().body(Map.of(
                "error", String.join(" ", errors.values()),
                "errors", errors,
                "timestamp", LocalDateTime.now().toString()));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidBody(
            HttpMessageNotReadableException ex, HttpServletRequest request) {
        return invalidBody((request.getContextPath() + "/auth/login").equals(request.getRequestURI())
                ? LoginRequestDTO.INVALID_CREDENTIALS : "Corpo da requisição inválido.");
    }

    private ResponseEntity<Map<String, Object>> invalidBody(String message) {
        return ResponseEntity.badRequest().body(Map.of(
                "error", message, "timestamp", LocalDateTime.now().toString()));
    }

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Map<String, Object>> handleApiException(ApiException ex) {
        return ResponseEntity.status(ex.getStatus()).body(Map.of(
                "error", ex.getMessage(),
                "timestamp", LocalDateTime.now().toString()));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleRuntimeException(RuntimeException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "error", ex.getMessage(),
                "timestamp", LocalDateTime.now().toString()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGenericException(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "Erro interno no servidor. Tente novamente.",
                "detail", ex.getMessage(),
                "timestamp", LocalDateTime.now().toString()));
    }
}
