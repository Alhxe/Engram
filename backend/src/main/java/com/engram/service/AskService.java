package com.engram.service;

import com.engram.ai.AiCompletionResult;
import com.engram.ai.AiTask;
import com.engram.web.dto.AskResponse;
import com.engram.web.dto.AskSource;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Answers a question grounded in the user's own notes (retrieval-augmented):
 * find the most relevant pages with FTS5, feed them to the model, and return
 * the answer with the pages it cited. Retrieval is free; only the answer costs.
 */
@Service
public class AskService {

    private static final int MAX_SOURCES = 6;
    private static final int MAX_CHARS_PER_SOURCE = 1500;

    private final JdbcClient jdbcClient;
    private final AiService aiService;

    public AskService(JdbcClient jdbcClient, AiService aiService) {
        this.jdbcClient = jdbcClient;
        this.aiService = aiService;
    }

    @Transactional(readOnly = true)
    public AskResponse ask(UUID userId, String question, UUID scopeId) {
        String fts = toFtsQuery(question);
        List<RetrievedNote> candidates = fts.isEmpty()
                ? List.of()
                : scopeId != null ? retrieveInScope(fts, scopeId) : retrieve(fts);
        if (candidates.isEmpty()) {
            return new AskResponse("", List.of());
        }

        StringBuilder context = new StringBuilder();
        List<AskSource> sources = new ArrayList<>();
        for (int i = 0; i < candidates.size(); i++) {
            RetrievedNote s = candidates.get(i);
            int index = i + 1;
            context.append("[").append(index).append("] ").append(s.title()).append("\n")
                    .append(trim(toPlainText(s.content()))).append("\n\n");
            sources.add(new AskSource(index, s.id(), s.title()));
        }

        String system = """
                You answer the user's question using ONLY the notes provided below.
                Cite the notes you use inline as [1], [2], etc. matching their numbers.
                If the notes do not contain enough to answer, say so plainly.
                Answer in the same language as the question, and be concise.
                """;
        String prompt = "Notes:\n" + context + "\nQuestion: " + question;

        AiCompletionResult result = aiService.run(userId, AiTask.ASK, system, prompt, 1000);
        return new AskResponse(result.text().trim(), sources);
    }

    private List<RetrievedNote> retrieve(String fts) {
        return jdbcClient.sql("""
                SELECT n.id AS id, n.title AS title, n.content AS content
                FROM node n
                WHERE n.deleted_at IS NULL
                  AND n.id IN (SELECT node_id FROM node_fts WHERE node_fts MATCH :query)
                ORDER BY n.updated_at DESC
                LIMIT :limit
                """)
                .param("query", fts)
                .param("limit", MAX_SOURCES)
                .query((rs, rowNum) -> new RetrievedNote(
                        UUID.fromString(rs.getString("id")),
                        rs.getString("title"),
                        rs.getString("content")))
                .list();
    }

    /** Same retrieval, but restricted to a page and all of its descendants. */
    private List<RetrievedNote> retrieveInScope(String fts, UUID scopeId) {
        return jdbcClient.sql("""
                WITH RECURSIVE scope(id) AS (
                    SELECT id FROM node WHERE id = :scope
                    UNION ALL
                    SELECT n.id FROM node n JOIN scope s ON n.parent_id = s.id
                )
                SELECT n.id AS id, n.title AS title, n.content AS content
                FROM node n
                WHERE n.deleted_at IS NULL
                  AND n.id IN (SELECT id FROM scope)
                  AND n.id IN (SELECT node_id FROM node_fts WHERE node_fts MATCH :query)
                ORDER BY n.updated_at DESC
                LIMIT :limit
                """)
                .param("scope", scopeId.toString())
                .param("query", fts)
                .param("limit", MAX_SOURCES)
                .query((rs, rowNum) -> new RetrievedNote(
                        UUID.fromString(rs.getString("id")),
                        rs.getString("title"),
                        rs.getString("content")))
                .list();
    }

    private String trim(String text) {
        return text.length() > MAX_CHARS_PER_SOURCE ? text.substring(0, MAX_CHARS_PER_SOURCE) : text;
    }

    private String toPlainText(String html) {
        if (html == null) {
            return "";
        }
        return html
                .replaceAll("(?is)<(script|style)[^>]*>.*?</\\1>", " ")
                .replaceAll("<[^>]+>", " ")
                .replace("&nbsp;", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String toFtsQuery(String raw) {
        return Arrays.stream(raw.trim().split("\\s+"))
                .filter(token -> token.length() > 1)
                .map(token -> '"' + token.replace("\"", "\"\"") + '"')
                .collect(Collectors.joining(" OR "));
    }
}
