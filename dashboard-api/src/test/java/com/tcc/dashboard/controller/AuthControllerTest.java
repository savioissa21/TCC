package com.tcc.dashboard.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tcc.dashboard.dto.LoginRequestDTO;
import com.tcc.dashboard.exception.GlobalExceptionHandler;
import com.tcc.dashboard.model.User;
import com.tcc.dashboard.repository.UserRepository;
import com.tcc.dashboard.security.TokenService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AuthControllerTest {
    private UserRepository repository;
    private PasswordEncoder encoder;
    private TokenService tokens;
    private LocalValidatorFactoryBean validator;
    private MockMvc mvc;

    @BeforeEach
    void setup() {
        repository = mock(UserRepository.class);
        tokens = mock(TokenService.class);
        encoder = spy(new BCryptPasswordEncoder(4));
        validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        mvc = MockMvcBuilders.standaloneSetup(new AuthController(repository, encoder, tokens))
                .setControllerAdvice(new GlobalExceptionHandler()).setValidator(validator).build();
        clearInvocations(encoder);
    }

    @AfterEach
    void closeValidator() { validator.close(); }

    @ParameterizedTest
    @MethodSource("invalidRegistrations")
    void rejectsInvalidRegistrationBeforeAccessingDatabase(String body) throws Exception {
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").isString())
                .andExpect(jsonPath("$.errors").isMap())
                .andExpect(jsonPath("$.detail").doesNotExist())
                .andExpect(jsonPath("$.rejectedValue").doesNotExist());
        verifyNoInteractions(repository, encoder, tokens);
    }

    static Stream<String> invalidRegistrations() {
        return Stream.of(
                "{}", registration("name", null), registration("name", " "),
                registration("name", " A "), registration("name", "A".repeat(101)),
                registration("email", null), registration("email", ""),
                registration("email", " "), registration("email", "invalid-email"),
                registration("email", "a".repeat(255)),
                registration("password", null), registration("password", ""),
                registration("password", "      "), registration("password", "12345"),
                registration("password", "a".repeat(73)),
                registration("password", "a".repeat(69) + "😀"));
    }

    @ParameterizedTest
    @MethodSource("invalidLogins")
    void rejectsInvalidLoginWithGenericMessageBeforeDatabaseAccess(String body) throws Exception {
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(LoginRequestDTO.INVALID_CREDENTIALS))
                .andExpect(jsonPath("$.errors").doesNotExist())
                .andExpect(jsonPath("$.detail").doesNotExist());
        verifyNoInteractions(repository, encoder, tokens);
    }

    static Stream<String> invalidLogins() {
        return Stream.of("{}", login("email", null), login("email", " "),
                login("email", "invalid-email"), login("email", "a".repeat(255)),
                login("password", null), login("password", ""), login("password", " "),
                login("password", "a".repeat(73)), login("password", "a".repeat(69) + "😀"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "null", "{", "[]", "{\"password\":{\"secret\":\"DO-NOT-ECHO\"}}"})
    void handlesMissingOrMalformedLoginBodyWithoutExposingInput(String body) throws Exception {
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(LoginRequestDTO.INVALID_CREDENTIALS))
                .andExpect(jsonPath("$.detail").doesNotExist());
        verifyNoInteractions(repository, encoder, tokens);
    }

    @Test
    void doesNotEchoPasswordsInRegistrationValidationErrors() throws Exception {
        var result = mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(registration("password", "DO-NOT-ECHO".repeat(10))))
                .andExpect(status().isBadRequest()).andReturn();
        assertFalse(result.getResponse().getContentAsString().contains("DO-NOT-ECHO"));
    }

    @Test
    void rejectsMalformedRegistrationWithoutRawParserDetails() throws Exception {
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"DO-NOT-ECHO"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Corpo da requisição inválido."))
                .andExpect(jsonPath("$.detail").doesNotExist());
        verifyNoInteractions(repository, encoder, tokens);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void returnsIdenticalUnauthorizedMessageForUnknownAccountAndWrongPassword(boolean exists) throws Exception {
        var user = new User("Ana", "ana@example.com", new BCryptPasswordEncoder(4).encode("correct-password"));
        when(repository.findByEmail("ana@example.com"))
                .thenReturn(exists ? Optional.of(user) : Optional.empty());

        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(login("password", "wrong-password")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("E-mail ou senha inválidos"))
                .andExpect(jsonPath("$.detail").doesNotExist());
        verify(encoder).matches(eq("wrong-password"), anyString());
        verifyNoInteractions(tokens);
        verify(repository, never()).save(any());
    }

    @Test
    void acceptsValidLoginIncludingExistingShortPassword() throws Exception {
        var user = new User("Ana", "ana@example.com", new BCryptPasswordEncoder(4).encode("abc"));
        when(repository.findByEmail("ana@example.com")).thenReturn(Optional.of(user));
        when(tokens.generateToken(user)).thenReturn("test-token");
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON).content(login("password", "abc")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Ana"))
                .andExpect(jsonPath("$.token").value("test-token"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"123456", "  senha  "})
    void hashesValidRegistrationPasswordWithoutTrimmingIt(String password) throws Exception {
        when(repository.findByEmail("ana@example.com")).thenReturn(Optional.empty());
        when(tokens.generateToken(any())).thenReturn("test-token");
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(registration("password", password)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.token").value("test-token"));
        var saved = ArgumentCaptor.forClass(User.class);
        verify(repository).save(saved.capture());
        assertEquals("Ana", saved.getValue().getName());
        assertNotEquals(password, saved.getValue().getPassword());
        assertTrue(new BCryptPasswordEncoder(4).matches(password, saved.getValue().getPassword()));
    }

    @Test
    void acceptsMaximumFieldLengthsAndUtf8PasswordBoundary() throws Exception {
        String email = "a".repeat(64) + "@" + "b".repeat(63) + "." + "c".repeat(63) + "." + "d".repeat(61);
        String password = "a".repeat(68) + "😀";
        assertEquals(254, email.length());
        when(repository.findByEmail(email)).thenReturn(Optional.empty());
        when(tokens.generateToken(any())).thenReturn("test-token");
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("name", "N".repeat(100), "email", email, "password", password))))
                .andExpect(status().isOk());
        verify(repository).save(any(User.class));
    }

    @Test
    void duplicateEmailDoesNotSaveOrGenerateToken() throws Exception {
        when(repository.findByEmail("ana@example.com"))
                .thenReturn(Optional.of(new User("Ana", "ana@example.com", "hash")));
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(registration("name", "Outra pessoa")))
                .andExpect(status().isBadRequest());
        verify(repository, never()).save(any());
        verifyNoInteractions(tokens, encoder);
    }

    private static String registration(String field, String value) {
        var body = new HashMap<>(Map.of("name", "Ana", "email", "ana@example.com", "password", "123456"));
        body.put(field, value);
        return json(body);
    }

    private static String login(String field, String value) {
        var body = new HashMap<>(Map.of("email", "ana@example.com", "password", "123456"));
        body.put(field, value);
        return json(body);
    }

    private static String json(Map<String, String> body) {
        try { return new ObjectMapper().writeValueAsString(body); }
        catch (Exception ex) { throw new IllegalStateException(ex); }
    }
}
