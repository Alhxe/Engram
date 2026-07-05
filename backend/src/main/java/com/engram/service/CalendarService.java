package com.engram.service;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Builds an iCalendar feed from every page that has a DATE property. */
@Service
public class CalendarService {

    private final JdbcClient jdbcClient;

    public CalendarService(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Transactional(readOnly = true)
    public String feed() {
        StringBuilder ics = new StringBuilder();
        ics.append("BEGIN:VCALENDAR\r\n")
                .append("VERSION:2.0\r\n")
                .append("PRODID:-//Engram//Knowledge//EN\r\n")
                .append("CALSCALE:GREGORIAN\r\n");

        jdbcClient.sql("""
                SELECT n.id AS id, n.title AS title, np.name AS prop, np.value AS value
                FROM node_property np
                JOIN node n ON n.id = np.node_id
                WHERE np.type = 'DATE' AND np.value <> '' AND n.deleted_at IS NULL
                """)
                .query((rs, rowNum) -> {
                    String date = rs.getString("value").replace("-", "");
                    if (date.length() != 8) {
                        return "";
                    }
                    String summary = escape(rs.getString("title"));
                    String prop = escape(rs.getString("prop"));
                    ics.append("BEGIN:VEVENT\r\n")
                            .append("UID:").append(rs.getString("id")).append("-").append(rs.getString("prop"))
                            .append("@engram\r\n")
                            .append("DTSTART;VALUE=DATE:").append(date).append("\r\n")
                            .append("SUMMARY:").append(summary).append(" (").append(prop).append(")\r\n")
                            .append("END:VEVENT\r\n");
                    return "";
                })
                .list();

        ics.append("END:VCALENDAR\r\n");
        return ics.toString();
    }

    private String escape(String text) {
        if (text == null) {
            return "";
        }
        return text.replace("\\", "\\\\").replace(",", "\\,").replace(";", "\\;").replace("\n", "\\n");
    }
}
