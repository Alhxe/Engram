package com.engram.persistence;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;

/**
 * Persists every {@link Instant} as a fixed-width ISO-8601 UTC string. The
 * SQLite JDBC driver's own timestamp parsing is incompatible with how Hibernate
 * writes instants, so we bypass it: the value is stored as readable text that
 * also sorts chronologically (fixed millisecond precision).
 */
@Converter(autoApply = true)
public class InstantAttributeConverter implements AttributeConverter<Instant, String> {

    private static final DateTimeFormatter FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");

    @Override
    public String convertToDatabaseColumn(Instant attribute) {
        return attribute == null ? null : FORMAT.format(attribute.atZone(ZoneOffset.UTC));
    }

    @Override
    public Instant convertToEntityAttribute(String dbData) {
        return dbData == null ? null : LocalDateTime.parse(dbData, FORMAT).toInstant(ZoneOffset.UTC);
    }
}
