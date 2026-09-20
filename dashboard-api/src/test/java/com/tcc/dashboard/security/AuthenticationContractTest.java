package com.tcc.dashboard.security;

import com.tcc.dashboard.model.User;
import com.tcc.dashboard.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.UUID;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthenticationContractTest {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired TokenService tokens;
    private final ObjectMapper json = new ObjectMapper();

    @Test
    void canonicalEmailAndRelativeApiRoutesWorkTogether() throws Exception {
        String email = "contract-" + UUID.randomUUID() + "@example.test";
        String body = "{\"name\":\"Teste\",\"email\":\"  " + email.toUpperCase() + "  \",\"password\":\"testing-123\"}";
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk());
        assertTrue(users.findByEmail(email).isPresent());
        String login = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(body)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String token = json.readTree(login).get("token").asText();
        for (String route : new String[]{"/api/establishments", "/api/reviews", "/api/reviews/stats"}) {
            mvc.perform(get(route).header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        }
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());
        for (String prefix : new String[]{"", "Basic ", "FakeBearer ", "Bearer Bearer "}) {
            mvc.perform(get("/api/establishments").header("Authorization", prefix + token))
                    .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.status").value(401));
        }
        mvc.perform(get("/api/establishments").header("Authorization", "bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    void deletedUserTokenIsUnauthorizedNotInternalError() throws Exception {
        User missing = new User();
        missing.setEmail("removed-" + UUID.randomUUID() + "@example.test");
        mvc.perform(get("/api/establishments").header("Authorization", "Bearer " + tokens.generateToken(missing)))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void publicReadinessAndMalformedLoginHaveStableContracts() throws Exception {
        mvc.perform(get("/api/health")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("UP"));
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("{"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("E-mail ou senha inválidos"))
                .andExpect(jsonPath("$.status").value(400));
    }
}
