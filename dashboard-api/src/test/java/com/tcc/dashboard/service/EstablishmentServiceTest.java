package com.tcc.dashboard.service;

import com.tcc.dashboard.model.Establishment;
import com.tcc.dashboard.model.User;
import com.tcc.dashboard.repository.EstablishmentRepository;
import com.tcc.dashboard.repository.ReviewRepository;
import com.tcc.dashboard.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EstablishmentServiceTest {

    @Mock
    private EstablishmentRepository establishmentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ReviewRepository reviewRepository;

    @InjectMocks
    private EstablishmentService establishmentService;

    @Test
    void rejectsGoogleMapsSearchUrlBeforeSaving() {
        RuntimeException exception = assertThrows(RuntimeException.class, () ->
                establishmentService.createEstablishment(
                        "Pizzaria",
                        "https://www.google.com/maps/search/pizzaria+goiania/@-16.7,-49.2,13z",
                        "user@example.com"
                )
        );

        assertEquals(
                "Links de pesquisa do Google Maps não são aceitos. Selecione um estabelecimento específico e copie o link da página da empresa.",
                exception.getMessage()
        );
        verifyNoInteractions(userRepository, establishmentRepository, reviewRepository);
    }

    @Test
    void acceptsSpecificEstablishmentUrl() {
        String url = "https://www.google.com/maps/place/Pizzaria+Exemplo/@-16.7,-49.2,17z";
        User owner = new User("Usuário", "user@example.com", "password");

        when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(owner));
        when(establishmentRepository.save(any(Establishment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        Establishment result = establishmentService.createEstablishment("Pizzaria", url, "user@example.com");

        assertEquals("Pizzaria", result.getName());
        assertEquals(url, result.getMapsUrl());
        assertEquals(owner, result.getOwner());
    }
}
