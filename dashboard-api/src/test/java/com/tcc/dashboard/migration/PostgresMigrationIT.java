package com.tcc.dashboard.migration;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.dao.DataIntegrityViolationException;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

@Testcontainers
class PostgresMigrationIT {
    @Container static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:15-alpine");
    DriverManagerDataSource source;
    JdbcTemplate jdbc;

    @BeforeEach void isolatedSchema() {
        String schema = "test_" + UUID.randomUUID().toString().replace("-", "");
        var admin = new JdbcTemplate(new DriverManagerDataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword()));
        admin.execute("CREATE SCHEMA " + schema);
        source = new DriverManagerDataSource(postgres.getJdbcUrl() + "&currentSchema=" + schema,
                postgres.getUsername(), postgres.getPassword());
        jdbc = new JdbcTemplate(source);
    }
    Flyway flyway(String target) {
        var config = Flyway.configure().dataSource(source).locations("classpath:db/migration").cleanDisabled(true);
        if (target != null) config.target(target);
        return config.load();
    }
    void seed(String email) {
        jdbc.update("INSERT INTO users(id,email,password,name) VALUES (?,?,'hash','Teste')", UUID.randomUUID(), email);
    }
    @Test void upgradesV3PreservingDataAndAllowingLongMapsUrl() {
        flyway("3").migrate();
        seed("  Owner@EXAMPLE.test  ");
        jdbc.update("INSERT INTO establishment(name,maps_url,owner_id) SELECT 'Legada','https://maps.app.goo.gl/old',id FROM users");
        assertEquals(1, flyway(null).migrate().migrationsExecuted);
        assertEquals("owner@example.test", jdbc.queryForObject("SELECT email FROM users", String.class));
        String url = "https://www.google.com/maps/place/" + "a".repeat(1900);
        jdbc.update("UPDATE establishment SET maps_url=?", url);
        assertEquals(url, jdbc.queryForObject("SELECT maps_url FROM establishment", String.class));
        assertEquals(0, flyway(null).migrate().migrationsExecuted);
        flyway(null).validate();
    }
    @Test void canonicalEmailConstraintAndUniquenessHold() {
        assertEquals(4, flyway(null).migrate().migrationsExecuted);
        seed("owner@example.test");
        assertThrows(DataIntegrityViolationException.class, () -> seed("owner@example.test"));
        assertThrows(DataIntegrityViolationException.class, () -> seed("OWNER@example.test"));
        assertThrows(DataIntegrityViolationException.class, () -> seed(" owner@example.test "));
    }
    @Test void emailCollisionRollsBackRatherThanMergingAccounts() {
        flyway("3").migrate();
        seed("owner@example.test");
        seed("OWNER@example.test");
        assertThrows(FlywayException.class, () -> flyway(null).migrate());
        assertEquals(2, jdbc.queryForObject("SELECT count(*) FROM users", Integer.class));
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM users WHERE email='OWNER@example.test'", Integer.class));
        assertEquals("3", flyway("3").info().current().getVersion().getVersion());
    }
}
