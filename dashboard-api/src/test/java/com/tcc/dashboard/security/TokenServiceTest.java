package com.tcc.dashboard.security;

import com.tcc.dashboard.model.User;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import static org.junit.jupiter.api.Assertions.*;

class TokenServiceTest {
    private static final String SECRET = "only-for-tests-0123456789-abcdefghijklmnopqrstuvwxyz";
    private TokenService service(String secret) {
        TokenService service = new TokenService();
        ReflectionTestUtils.setField(service, "secret", secret);
        return service;
    }
    @Test void rejectsWeakLengthAtStartup() {
        assertThrows(IllegalStateException.class, () -> service("short").validateSecret());
        assertThrows(IllegalStateException.class, () -> service(" ".repeat(40)).validateSecret());
        assertDoesNotThrow(() -> service(SECRET).validateSecret());
    }
    @Test void rejectsExpiredMalformedAndWrongIssuerTokens() {
        TokenService service = service(SECRET);
        User user = new User();
        user.setEmail("test@example.test");
        assertEquals(user.getEmail(), service.validateToken(service.generateToken(user)));
        assertEquals("", service.validateToken("malformed"));
        for (boolean expired : new boolean[]{true, false}) {
            String token = Jwts.builder().setSubject(user.getEmail())
                    .setIssuer(expired ? "Dashboard SaaS" : "another issuer")
                    .setExpiration(new Date(System.currentTimeMillis() + (expired ? -60000 : 60000)))
                    .signWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8)), SignatureAlgorithm.HS256).compact();
            assertEquals("", service.validateToken(token));
        }
    }
}
