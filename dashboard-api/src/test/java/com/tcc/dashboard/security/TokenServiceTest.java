package com.tcc.dashboard.security;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import static org.junit.jupiter.api.Assertions.*;

class TokenServiceTest {
    @Test
    void rejectsWeakSecretsAtStartupWithoutPrintingThem() {
        for (String secret : new String[]{"", "short-secret", "x".repeat(64)}) {
            var tokens = new TokenService();
            ReflectionTestUtils.setField(tokens, "secret", secret);
            assertThrows(IllegalStateException.class, tokens::validateSecret);
        }
        var tokens = new TokenService();
        ReflectionTestUtils.setField(tokens, "secret", "test-0123456789-abcdefghijklmnopqrstuvwxyz");
        assertDoesNotThrow(tokens::validateSecret);
    }
}
