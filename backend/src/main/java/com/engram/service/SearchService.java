package com.engram.service;

import com.engram.model.NodeKind;
import com.engram.web.dto.PageResponse;
import com.engram.web.dto.SearchHit;
import com.engram.web.dto.SearchRequest;
import com.engram.web.dto.SearchResponse;
import com.engram.web.dto.TagHit;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Search across ALL data. Returns matching tags (to pivot on) plus matching
 * pages, where a page matches by full-text (FTS5) over title/content, by a tag
 * name, or by a property value — and each hit says which. With no text but a
 * tag filter it simply lists the pages carrying that tag. Native SQL because
 * FTS5 lives outside JPA.
 */
@Service
public class SearchService {

    private static final String MATCH_CONDITION = """
            (n.id IN (SELECT node_id FROM node_fts WHERE node_fts MATCH :query)
             OR EXISTS (SELECT 1 FROM node_tag nt JOIN tag t ON t.id = nt.tag_id
                        WHERE nt.node_id = n.id AND t.name LIKE :like)
             OR EXISTS (SELECT 1 FROM node_property np
                        WHERE np.node_id = n.id AND np.value LIKE :like))
            """;

    private final JdbcClient jdbcClient;

    public SearchService(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @Transactional(readOnly = true)
    public SearchResponse search(SearchRequest request) {
        int page = request.pageOrDefault();
        int size = request.sizeOrDefault();
        String raw = request.query() == null ? "" : request.query().trim();
        boolean hasText = !raw.isEmpty();
        boolean hasTagFilter = request.tags() != null && !request.tags().isEmpty();

        if (!hasText && !hasTagFilter) {
            return new SearchResponse(List.of(), PageResponse.of(List.of(), page, size, 0));
        }

        List<TagHit> tags = hasText ? searchTags(raw) : List.of();

        Map<String, Object> params = new HashMap<>();
        StringBuilder where = new StringBuilder(" WHERE n.deleted_at IS NULL");
        if (hasText) {
            where.append(" AND ").append(MATCH_CONDITION);
            params.put("query", toFtsQuery(raw));
            params.put("like", "%" + raw + "%");
        }
        where.append(buildFilters(request, params));

        String select = hasText
                ? """
                  SELECT n.id AS node_id, n.title AS title, n.kind AS kind,
                         (SELECT snippet(node_fts, 2, '<mark>', '</mark>', '…', 12)
                          FROM node_fts WHERE node_fts.node_id = n.id AND node_fts MATCH :query) AS snippet,
                         (CASE WHEN n.title LIKE :like THEN 1 ELSE 0 END) AS title_match,
                         (CASE WHEN EXISTS (SELECT 1 FROM node_tag nt JOIN tag t ON t.id = nt.tag_id
                               WHERE nt.node_id = n.id AND t.name LIKE :like) THEN 1 ELSE 0 END) AS tag_match,
                         (CASE WHEN EXISTS (SELECT 1 FROM node_property np
                               WHERE np.node_id = n.id AND np.value LIKE :like) THEN 1 ELSE 0 END) AS prop_match
                  FROM node n
                  """
                : """
                  SELECT n.id AS node_id, n.title AS title, n.kind AS kind,
                         NULL AS snippet, 0 AS title_match, 0 AS tag_match, 0 AS prop_match
                  FROM node n
                  """;

        String order = " ORDER BY title_match DESC, (snippet IS NOT NULL) DESC, n.updated_at DESC"
                + " LIMIT :size OFFSET :offset";

        Map<String, Object> searchParams = new HashMap<>(params);
        searchParams.put("size", size);
        searchParams.put("offset", page * size);

        List<SearchHit> hits = jdbcClient.sql(select + where + order)
                .params(searchParams)
                .query((rs, rowNum) -> new SearchHit(
                        UUID.fromString(rs.getString("node_id")),
                        rs.getString("title"),
                        rs.getString("snippet"),
                        NodeKind.valueOf(rs.getString("kind")),
                        rs.getInt("title_match") == 1,
                        rs.getInt("tag_match") == 1,
                        rs.getInt("prop_match") == 1))
                .list();

        long total = jdbcClient.sql("SELECT count(*) FROM node n " + where)
                .params(params).query(Long.class).single();

        return new SearchResponse(tags, PageResponse.of(hits, page, size, total));
    }

    private List<TagHit> searchTags(String raw) {
        return jdbcClient.sql("""
                SELECT t.id AS id, t.name AS name, count(n.id) AS cnt
                FROM tag t
                LEFT JOIN node_tag nt ON nt.tag_id = t.id
                LEFT JOIN node n ON n.id = nt.node_id AND n.deleted_at IS NULL
                WHERE t.name LIKE :like
                GROUP BY t.id, t.name
                ORDER BY cnt DESC, t.name
                LIMIT 10
                """)
                .param("like", "%" + raw + "%")
                .query((rs, rowNum) -> new TagHit(
                        UUID.fromString(rs.getString("id")), rs.getString("name"), rs.getLong("cnt")))
                .list();
    }

    private String buildFilters(SearchRequest request, Map<String, Object> params) {
        StringBuilder filters = new StringBuilder();
        if (request.parentId() != null) {
            filters.append(" AND n.parent_id = :parentId");
            params.put("parentId", request.parentId().toString());
        }
        if (request.kinds() != null && !request.kinds().isEmpty()) {
            filters.append(" AND n.kind IN (:kinds)");
            params.put("kinds", request.kinds().stream().map(Enum::name).toList());
        }
        if (request.tags() != null && !request.tags().isEmpty()) {
            filters.append(" AND EXISTS (SELECT 1 FROM node_tag nt JOIN tag t ON t.id = nt.tag_id"
                    + " WHERE nt.node_id = n.id AND t.name IN (:tags))");
            params.put("tags", request.tags());
        }
        return filters.toString();
    }

    /**
     * Turns raw user input into a safe FTS5 MATCH expression by quoting each
     * token, avoiding syntax errors from special characters.
     */
    private String toFtsQuery(String raw) {
        return Arrays.stream(raw.trim().split("\\s+"))
                .filter(token -> !token.isBlank())
                .map(token -> '"' + token.replace("\"", "\"\"") + '"')
                .collect(Collectors.joining(" "));
    }
}
