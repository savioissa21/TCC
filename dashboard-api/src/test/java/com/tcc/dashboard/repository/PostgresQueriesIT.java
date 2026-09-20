package com.tcc.dashboard.repository;

import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/** A mesma suíte de consultas/isolamento roda em PostgreSQL real, sem skips. */
@Testcontainers
@ActiveProfiles(value = "postgres", inheritProfiles = false)
class PostgresQueriesIT extends ReviewQueriesTest {
    @Container
    static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:15-alpine");

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        registry.add("spring.jpa.properties.hibernate.generate_statistics", () -> "true");
        registry.add("spring.jpa.properties.hibernate.query.fail_on_pagination_over_collection_fetch", () -> "true");
        registry.add("mining.schedule.enabled", () -> "false");
        registry.add("api.security.token.secret", () -> "only-for-postgres-tests-0123456789-abcdefghijklmnopqrstuvwxyz");
        registry.add("logging.level.root", () -> "WARN");
    }
}
