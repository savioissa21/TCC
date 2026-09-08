package com.tcc.dashboard.dto;

import com.tcc.dashboard.validation.Utf8Size;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequestDTO(
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Size(max = 72) @Utf8Size(max = 72) String password) {
    public static final String INVALID_CREDENTIALS = "E-mail ou senha inválidos";
}
