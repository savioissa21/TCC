package com.tcc.dashboard.controller;

import com.tcc.dashboard.dto.LoginRequestDTO;
import com.tcc.dashboard.dto.RegisterRequestDTO;
import com.tcc.dashboard.dto.ResponseDTO;
import com.tcc.dashboard.exception.BadRequestException;
import com.tcc.dashboard.exception.UnauthorizedException;
import com.tcc.dashboard.model.User;
import com.tcc.dashboard.repository.UserRepository;
import com.tcc.dashboard.security.TokenService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;
    private final String dummyPasswordHash;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder, TokenService tokenService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
        this.dummyPasswordHash = passwordEncoder.encode("non-account-placeholder");
    }

    @PostMapping("/login")
    public ResponseEntity<ResponseDTO> login(@Valid @RequestBody LoginRequestDTO body) {
        User user = userRepository.findByEmail(body.email()).orElse(null);
        // Check a hash even for an unknown account to avoid the immediate failure path.
        boolean matches = passwordEncoder.matches(body.password(),
                user == null ? dummyPasswordHash : user.getPassword());
        if (user == null || !matches) {
            throw new UnauthorizedException(LoginRequestDTO.INVALID_CREDENTIALS);
        }

        String token = tokenService.generateToken(user);
        return ResponseEntity.ok(new ResponseDTO(user.getName(), token));
    }

    @PostMapping("/register")
    public ResponseEntity<ResponseDTO> register(@Valid @RequestBody RegisterRequestDTO body) {
        Optional<User> user = userRepository.findByEmail(body.email());

        if (user.isPresent()) {
            throw new BadRequestException("Email já cadastrado.");
        }

        User newUser = new User();
        newUser.setPassword(passwordEncoder.encode(body.password()));
        newUser.setEmail(body.email());
        newUser.setName(body.name());

        userRepository.save(newUser);

        String token = tokenService.generateToken(newUser);
        return ResponseEntity.ok(new ResponseDTO(newUser.getName(), token));
    }
}
