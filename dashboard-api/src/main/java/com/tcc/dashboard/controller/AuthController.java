package com.tcc.dashboard.controller;

import com.tcc.dashboard.dto.LoginRequestDTO;
import com.tcc.dashboard.dto.RegisterRequestDTO;
import com.tcc.dashboard.dto.ResponseDTO;
import com.tcc.dashboard.exception.BadRequestException;
import com.tcc.dashboard.exception.NotFoundException;
import com.tcc.dashboard.exception.UnauthorizedException;
import com.tcc.dashboard.model.User;
import com.tcc.dashboard.repository.UserRepository;
import com.tcc.dashboard.security.TokenService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.CrossOrigin;

import java.util.Optional;

@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = "*") // Importante pro React acessar
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private TokenService tokenService;

    @PostMapping("/login")
    public ResponseEntity<ResponseDTO> login(@RequestBody LoginRequestDTO body) {
        User user = userRepository.findByEmail(body.email())
                .orElseThrow(() -> new NotFoundException("Usuário não encontrado."));

        if (!passwordEncoder.matches(body.password(), user.getPassword())) {
            throw new UnauthorizedException("Email ou senha incorretos.");
        }

        String token = tokenService.generateToken(user);
        return ResponseEntity.ok(new ResponseDTO(user.getName(), token));
    }

    @PostMapping("/register")
    public ResponseEntity<ResponseDTO> register(@RequestBody RegisterRequestDTO body) {
        Optional<User> user = userRepository.findByEmail(body.email());

        if (user.isPresent()) {
            throw new BadRequestException("Email já cadastrado.");
        }

        if (body.password() == null || body.password().isBlank()) {
            throw new BadRequestException("A senha é obrigatória.");
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