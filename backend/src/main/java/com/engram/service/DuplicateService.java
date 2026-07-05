package com.engram.service;

import com.engram.ai.AiCompletionResult;
import com.engram.ai.AiException;
import com.engram.ai.AiJson;
import com.engram.ai.AiTask;
import com.engram.web.dto.DuplicateSuggestion;
import com.engram.web.dto.NodeResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Finds likely duplicates of a page: retrieves similar pages by full-text
 * (title terms) and asks the model which are the SAME entity, not just related.
 */
@Service
public class DuplicateService {

    private static final int MAX_CANDIDATES = 10;
    private static final int SNIPPET_CHARS = 300;

    private final JdbcClient jdbcClient;
    private final AiService aiService;
    private final NodeService nodeService;
    private final ObjectMapper mapper;

    public DuplicateService(JdbcClient jdbcClient, AiService aiService,
                            NodeService nodeService, ObjectMapper mapper) {
        this.jdbcClient = jdbcClient;
        this.aiService = aiService;
        this.nodeService = nodeService;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<DuplicateSuggestion> find(UUID userId, UUID nodeId) {
        NodeResponse node = nodeService.get(nodeId);
        String title = node.title() == null ? "" : node.title().trim();
        String fts = toFtsQuery(title);
        if (fts.isEmpty()) {
            return List.of();
        }

        List<RetrievedNote> candidates = jdbcClient.sql("""
                SELECT n.id AS id, n.title AS title, n.content AS content
                FROM node n
                WHERE n.deleted_at IS NULL AND n.id <> :id
                  AND n.id IN (SELECT node_id FROM node_fts WHERE node_fts MATCH :query)
                ORDER BY n.updated_at DESC
                LIMIT :limit
                """)
                .param("id", nodeId.toString())
                .param("query", fts)
                .param("limit", MAX_CANDIDATES)
                .query((rs, rowNum) -> new RetrievedNote(
                        UUID.fromString(rs.getString("id")), rs.getString("title"), rs.getString("content")))
                .list();
        if (candidates.isEmpty()) {
            return List.of();
        }

        StringBuilder list = new StringBuilder();
        for (int i = 0; i < candidates.size(); i++) {
            RetrievedNote c = candidates.get(i);
            list.append("[").append(i + 1).append("] ").append(c.title()).append(" — ")
                    .append(snippet(c.content())).append("\n");
        }

        String system = """
                You detect DUPLICATE pages: candidates that describe the SAME entity, topic or item as
                the source and are redundant with it — not merely related or on a similar theme. Be strict:
                only flag a candidate if a user would want to merge it into the source. Return its number
                and a brief reason.
                Respond with ONLY a JSON array: [{"n":1,"reason":""}] (empty [] if none).
                """;
        String prompt = "Source page: " + title + "\n" + snippet(node.content())
                + "\n\nCandidates:\n" + list;

        AiCompletionResult result = aiService.run(userId, AiTask.LINKING, system, prompt, 500);
        return parse(result.text(), candidates);
    }

    private List<DuplicateSuggestion> parse(String raw, List<RetrievedNote> candidates) {
        try {
            JsonNode root = mapper.readTree(AiJson.clean(raw));
            if (!root.isArray()) {
                return List.of();
            }
            List<DuplicateSuggestion> out = new ArrayList<>();
            for (JsonNode entry : root) {
                int n = entry.path("n").asInt(0);
                if (n < 1 || n > candidates.size()) {
                    continue;
                }
                RetrievedNote c = candidates.get(n - 1);
                out.add(new DuplicateSuggestion(c.id(), c.title(), entry.path("reason").asText("")));
            }
            return out;
        } catch (Exception e) {
            throw new AiException("Could not parse duplicate suggestions", e);
        }
    }

    private String snippet(String html) {
        if (html == null) {
            return "";
        }
        String text = html.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim();
        return text.length() > SNIPPET_CHARS ? text.substring(0, SNIPPET_CHARS) + "…" : text;
    }

    private String toFtsQuery(String raw) {
        return Arrays.stream(raw.trim().split("\\s+"))
                .filter(token -> token.length() > 2)
                .map(token -> '"' + token.replace("\"", "\"\"") + '"')
                .collect(Collectors.joining(" OR "));
    }
}
