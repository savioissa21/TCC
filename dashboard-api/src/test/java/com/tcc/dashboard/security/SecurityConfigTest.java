package com.tcc.dashboard.security;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityConfigTest {

    @Autowired private com.tcc.dashboard.repository.UserRepository users;
    @Autowired private TokenService tokens;

    @Test
    void rejectsInvalidExpiredRemovedAndMalformedBearerTokens() throws Exception {
        var user = users.save(new com.tcc.dashboard.model.User("Token Test", "token-test@example.com", "hash"));
        String token = tokens.generateToken(user);
        mockMvc.perform(get("/establishments").header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        for (String header : new String[]{token, "Basic " + token, "prefixBearer " + token, "Bearer invalid", "Bearer  " + token}) {
            mockMvc.perform(get("/establishments").header("Authorization", header))
                    .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.status").value(401));
        }
        String expired = io.jsonwebtoken.Jwts.builder().setSubject(user.getEmail()).setIssuer("Dashboard SaaS")
                .setExpiration(new java.util.Date(1))
                .signWith(io.jsonwebtoken.security.Keys.hmacShaKeyFor(
                        "only-for-tests-0123456789-abcdefghijklmnopqrstuvwxyz".getBytes(java.nio.charset.StandardCharsets.UTF_8)))
                .compact();
        mockMvc.perform(get("/establishments").header("Authorization", "Bearer " + expired)).andExpect(status().isUnauthorized());
        users.delete(user);
        mockMvc.perform(get("/establishments").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.timestamp").isNotEmpty());
    }

    @Test
    void corsRejectsUnconfiguredOrigin() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options("/establishments")
                .header("Origin", "https://untrusted.example").header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden());
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options("/establishments")
                .header("Origin", "http://localhost:5173").header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk());
    }

    @Autowired
    private MockMvc mockMvc;

    @Test
    void unauthenticatedRequestUsesStandardJsonError() throws Exception {
        mockMvc.perform(get("/establishments"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith("application/json"))
                .andExpect(jsonPath("$.error")
                        .value("Autenticação necessária para acessar este recurso."))
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
    }

    @Test
    void healthEndpointIsPublic() throws Exception {
        mockMvc.perform(get("/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }
}
