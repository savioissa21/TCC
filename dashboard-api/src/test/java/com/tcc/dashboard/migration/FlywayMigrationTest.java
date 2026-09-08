package com.tcc.dashboard.migration;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

class FlywayMigrationTest {
    private DriverManagerDataSource dataSource;
    private JdbcTemplate jdbc;

    @BeforeEach
    void isolatedDatabase() {
        dataSource = new DriverManagerDataSource(
                "jdbc:h2:mem:migration-" + UUID.randomUUID() + ";MODE=PostgreSQL;DB_CLOSE_DELAY=-1", "sa", "");
        jdbc = new JdbcTemplate(dataSource);
    }

    @Test
    void migratesEmptyDatabaseAndDoesNotReapplyVersions() {
        Flyway flyway = flyway();
        assertEquals(2, flyway.migrate().migrationsExecuted);
        assertEquals("2", flyway.info().current().getVersion().getVersion());
        flyway.validate();
        seedLegacyData();
        jdbc.update("update review set google_review_id = 'google-1' where id = 'legacy'");
        assertEquals(0, flyway.migrate().migrationsExecuted);
        assertLegacyDataPreserved();
        assertEquals("google-1", jdbc.queryForObject(
                "select google_review_id from review where id = 'legacy'", String.class));
    }

    @Test
    void refusesToAdoptNonEmptySchemaAutomatically() {
        createLegacySchema();
        seedLegacyData();
        assertThrows(FlywayException.class, () -> flyway().migrate());
        assertLegacyDataPreserved();
    }

    @Test
    void explicitBaselineUpgradesLegacyDatabaseWithoutLosingData() {
        createLegacySchema();
        seedLegacyData();
        Flyway flyway = flyway();
        flyway.baseline();
        assertEquals(1, flyway.migrate().migrationsExecuted);
        assertLegacyDataPreserved();
        assertNull(jdbc.queryForObject("select google_review_id from review where id = 'legacy'", String.class));
        flyway.validate();
        // Existing identity generators still work after adoption.
        jdbc.update("insert into aspect (name, review_id) values ('Novo aspecto', 'legacy')");
        assertEquals(2, jdbc.queryForObject("select count(*) from aspect", Integer.class));
    }

    @Test
    void adoptsSchemaAlreadyUpdatedByHibernateAndPreservesOriginalGoogleId() {
        createLegacySchema();
        runScript("V2__add_google_identity_and_review_indexes.sql");
        seedLegacyData();
        jdbc.update("update review set google_review_id = 'original-google-id' where id = 'legacy'");
        Flyway flyway = flyway();
        flyway.baseline();
        assertEquals(1, flyway.migrate().migrationsExecuted);
        assertLegacyDataPreserved();
        assertEquals("original-google-id", jdbc.queryForObject(
                "select google_review_id from review where id = 'legacy'", String.class));
    }

    @Test
    void enforcesGoogleIdUniquenessPerEstablishmentAndAllowsLegacyNulls() {
        flyway().migrate();
        seedLegacyData();
        Long store = jdbc.queryForObject("select id from establishment", Long.class);
        jdbc.update("insert into review (id, establishment_id) values ('another-legacy', ?)", store);
        jdbc.update("update review set google_review_id = 'google-1' where id = 'legacy'");
        assertThrows(DuplicateKeyException.class, () -> jdbc.update(
                "insert into review (id, establishment_id, google_review_id) values ('duplicate', ?, 'google-1')", store));
        jdbc.update("insert into establishment (name, owner_id) select 'Other', id from users");
        Long other = jdbc.queryForObject("select id from establishment where name = 'Other'", Long.class);
        jdbc.update("insert into review (id, establishment_id, google_review_id) values ('other', ?, 'google-1')", other);
        assertEquals(3, jdbc.queryForObject("select count(*) from review", Integer.class));
    }

    @Test
    void rejectsChangedMigrationChecksum() {
        Flyway flyway = flyway();
        flyway.migrate();
        jdbc.update("update \"flyway_schema_history\" set \"checksum\" = 0 where \"version\" = '2'");
        assertThrows(FlywayException.class, flyway::validate);
    }

    private Flyway flyway() {
        return Flyway.configure().dataSource(dataSource).locations("classpath:db/migration")
                .baselineVersion("1").baselineOnMigrate(false).cleanDisabled(true).load();
    }

    private void createLegacySchema() {
        runScript("V1__create_initial_schema.sql");
    }

    private void runScript(String filename) {
        new ResourceDatabasePopulator(new ClassPathResource("db/migration/" + filename)).execute(dataSource);
    }

    private void seedLegacyData() {
        UUID owner = UUID.randomUUID();
        jdbc.update("insert into users (id, email, password, name) values (?, 'owner@test.example', 'hash', 'Owner')", owner);
        jdbc.update("insert into establishment (name, owner_id, last_mining_status) values ('Original', ?, 'COMPLETED')", owner);
        Long store = jdbc.queryForObject("select id from establishment", Long.class);
        jdbc.update("insert into review (id, author, text, rating, establishment_id) values ('legacy', 'Ana', 'Original text', 5.0, ?)", store);
        jdbc.update("insert into aspect (name, review_id) values ('Comida', 'legacy')");
    }

    private void assertLegacyDataPreserved() {
        assertEquals(1, jdbc.queryForObject("select count(*) from users", Integer.class));
        assertEquals("COMPLETED", jdbc.queryForObject("select last_mining_status from establishment", String.class));
        assertEquals("Original text", jdbc.queryForObject("select text from review where id = 'legacy'", String.class));
        assertEquals("Comida", jdbc.queryForObject("select name from aspect", String.class));
    }
}
