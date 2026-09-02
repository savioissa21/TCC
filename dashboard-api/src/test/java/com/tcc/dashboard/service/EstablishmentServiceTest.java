package com.tcc.dashboard.service;

import com.tcc.dashboard.model.Establishment;
import com.tcc.dashboard.model.User;
import com.tcc.dashboard.exception.UnauthorizedException;
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
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
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
                                "Esse link não identifica um estabelecimento específico. Abra a empresa no Google Maps e use Compartilhar > Copiar link.",
                                exception.getMessage());
                verifyNoInteractions(userRepository, establishmentRepository, reviewRepository);
        }

        @Test
        void acceptsGoogleMapsShortenedUrl() {
                String url = "https://maps.app.goo.gl/VfkiBDD6m9U5RaCy7";
                User owner = new User("Usuário", "user@example.com", "password");

                when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(owner));
                when(establishmentRepository.save(any(Establishment.class)))
                                .thenAnswer(invocation -> invocation.getArgument(0));

                Establishment result = establishmentService.createEstablishment("Pastelaria", url,
                                "user@example.com");

                assertEquals(url, result.getMapsUrl());
                assertEquals(owner, result.getOwner());
        }

        @Test
        void acceptsGoogleMapsPlaceUrlWithShareParameters() {
                String url = "https://www.google.com/maps/place/Pastel+da+v%C3%B3+cleuza/@-17.3066586,-48.288953,4305m/data=!3m1!1e3!4m8!3m7!1s0x94a76372804ee625:0x9b25daaefa71e5f6!8m2!3d-17.2892789!4d-48.2769059!9m1!1b1!16s%2Fg%2F11fsjgmjdf?entry=ttu&g_ep=EgoyMDI2MDgyMy4wIKXMDSoASAFQAw%3D%3D";
                User owner = new User("Usuário", "user@example.com", "password");

                when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(owner));
                when(establishmentRepository.save(any(Establishment.class)))
                                .thenAnswer(invocation -> invocation.getArgument(0));

                Establishment result = establishmentService.createEstablishment("Pastelaria", url,
                                "user@example.com");

                assertEquals(url, result.getMapsUrl());
                assertEquals(owner, result.getOwner());
        }

        @Test
        void rejectsLookalikeGoogleDomain() {
                RuntimeException exception = assertThrows(RuntimeException.class,
                                () -> establishmentService.createEstablishment(
                                                "Pizzaria",
                                                "https://google.example.com/maps/place/Pizzaria",
                                                "user@example.com"));

                assertEquals(
                                "Informe um link do Google Maps, como maps.app.goo.gl ou google.com/maps/place/...",
                                exception.getMessage());
                verifyNoInteractions(userRepository, establishmentRepository, reviewRepository);
        }

        @Test
        void extractsUrlWhenUserPastesMarkdownLink() {
                String input = "[Google Maps](https://maps.app.goo.gl/VfkiBDD6m9U5RaCy7)";
                User owner = new User("Usuário", "user@example.com", "password");

                when(userRepository.findByEmail("user@example.com")).thenReturn(Optional.of(owner));
                when(establishmentRepository.save(any(Establishment.class)))
                                .thenAnswer(invocation -> invocation.getArgument(0));

                Establishment result = establishmentService.createEstablishment("Pastelaria", input,
                                "user@example.com");

                assertEquals("https://maps.app.goo.gl/VfkiBDD6m9U5RaCy7", result.getMapsUrl());
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

        @Test
        void enablesAutomaticUpdatesForOwnedEstablishment() {
                User owner = new User("Usuário", "user@example.com", "password");
                Establishment establishment = new Establishment("Loja", "https://www.google.com/maps/place/Loja");
                establishment.setOwner(owner);
                establishment.setAutomaticUpdatesEnabled(false);

                when(establishmentRepository.findById(7L)).thenReturn(Optional.of(establishment));
                when(establishmentRepository.save(establishment)).thenReturn(establishment);

                Establishment result = establishmentService.setAutomaticUpdates(7L, true, "user@example.com");

                assertTrue(result.getAutomaticUpdatesEnabled());
                assertNotNull(result.getNextMiningAt());
        }

        @Test
        void rejectsAccessToEstablishmentOwnedByAnotherUser() {
                User owner = new User("Owner", "owner@example.com", "password");
                Establishment establishment = new Establishment(
                                "Loja", "https://www.google.com/maps/place/Loja");
                establishment.setOwner(owner);
                when(establishmentRepository.findById(7L)).thenReturn(Optional.of(establishment));

                UnauthorizedException exception = assertThrows(
                                UnauthorizedException.class,
                                () -> establishmentService.getOwnedEstablishment(
                                                7L, "intruder@example.com"));

                assertEquals(
                                "Acesso negado: você não é o dono deste estabelecimento.",
                                exception.getMessage());
        }
}
