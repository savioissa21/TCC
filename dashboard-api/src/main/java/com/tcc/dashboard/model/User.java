package com.tcc.dashboard.model;

import jakarta.persistence.*;
import java.util.UUID;
import java.util.List;
import java.util.ArrayList;

@Entity
@Table(name = "users") // "user" é palavra reservada no Postgres, use "users"
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String password; // Aqui vamos salvar a senha criptografada

    private String name;

    // Um usuário pode ser dono de VÁRIOS estabelecimentos (franquia, por exemplo)
    @OneToMany(mappedBy = "owner", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Establishment> establishments = new ArrayList<>();

    public User() {}

    public User(String name, String email, String password) {
        this.name = name;
        this.email = email;
        this.password = password;
    }

    // Getters e Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public List<Establishment> getEstablishments() { return establishments; }
    public void setEstablishments(List<Establishment> establishments) { this.establishments = establishments; }
}