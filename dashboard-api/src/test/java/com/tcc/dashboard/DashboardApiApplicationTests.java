package com.tcc.dashboard;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@ActiveProfiles("test")
class DashboardApiApplicationTests {
    @Autowired private Flyway flyway;

    @Test
    void contextLoadsAfterMigrationsAndHibernateSchemaValidation() {
        assertEquals("2", flyway.info().current().getVersion().getVersion());
        assertEquals(0, flyway.info().pending().length);
        flyway.validate();
    }
}
