package com.tcc.dashboard.security;

import com.tcc.dashboard.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;

@Service
public class TokenService {

    @Value("${api.security.token.secret}")
    private String secret;

    public String generateToken(User user) {
        return Jwts.builder()
                .setSubject(user.getEmail()) // O email identifica o usuário
                .setIssuer("Dashboard SaaS")
                .setIssuedAt(new Date())
                .setExpiration(Date.from(LocalDateTime.now().plusHours(24).atZone(ZoneId.systemDefault()).toInstant())) // Expira em 24h
                .signWith(Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)), SignatureAlgorithm.HS256)
                .compact();
    }

    public String validateToken(String token) {
        try {
            return Jwts.parserBuilder()
                    .setSigningKey(Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)))
                    .build()
                    .parseClaimsJws(token)
                    .getBody()
                    .getSubject(); // Retorna o email se o token for válido
        } catch (Exception e) {
            return ""; // Token inválido
        }
    }
}