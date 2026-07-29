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
                RuntimeException exception = assertThrows(RuntimeException.class,
                                () -> establishmentService.createEstablishment(
                                                "Pizzaria",
                                                "https://www.google.com/maps/search/pizzaria+goiania/@-16.7,-49.2,13z",
                                                "user@example.com"));

                assertEquals(
                                "Links de pesquisa do Google Maps não são aceitos. Selecione um estabelecimento específico e copie o link da página da empresa.",
                                exception.getMessage());
                verifyNoInteractions(userRepository, establishmentRepository, reviewRepository);
        }

        @Test
        void rejectsGenericGoogleMapsUrlBeforeSaving() {
                RuntimeException exception = assertThrows(RuntimeException.class,
                                () -> establishmentService.createEstablishment(
                                                "Pizzaria",
                                                "https://www.google.com/maps/@-16.7,-49.2,13z",
                                                "user@example.com"));

                assertEquals(
                                "Esse link não identifica um estabelecimento específico. Abra a página da empresa no Google Maps e copie a URL completa, que deve conter /maps/place/.",
                                exception.getMessage());
                verifyNoInteractions(userRepository, establishmentRepository, reviewRepository);
        }

        @Test
        void rejectsShortenedUrlBeforeSaving() {
                RuntimeException exception = assertThrows(RuntimeException.class,
                                () -> establishmentService.createEstablishment(
                                                "Pizzaria",
                                                "https://maps.app.goo.gl/abc123",
                                                "user@example.com"));

                assertEquals(
                                "Links encurtados do Google Maps não são aceitos. Use o link completo da página do estabelecimento.",
                                exception.getMessage());
                verifyNoInteractions(userRepository, establishmentRepository, reviewRepository);
        }

        @Test
        void rejectsGoogleMapsShareLinkWithTrackingParamsBeforeSaving() {
                RuntimeException exception = assertThrows(RuntimeException.class,
                                () -> establishmentService.createEstablishment(
                                                "Pizzaria",
                                                "https://www.google.com/maps/place/Pz.%C3%81ria+-+Forneria+Criativa/@-16.675498,-49.3085628,14z/data=!3m1!5s0x935ef3e248a0911d:0xc32db09235713f62!4m11!1m2!2m1!1spizzaria+goiania!3m7!1s0x935ef3b7de96a087:0xb1e889a4e108886d!8m2!3d-16.6754977!4d-49.2704541!9m1!1b1!16s%2Fg%2F11j6wc7kvq?entry=ttu&g_ep=EgoyMDI2MDcyNi4wIKXMDSoASAFQAw%3D%3D",
                                                "user@example.com"));

                assertEquals(
                                "Esse link não é um link direto de estabelecimento do Google Maps. Use a URL da página do estabelecimento sem parâmetros de compartilhamento.",
                                exception.getMessage());
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
