package com.engram.service;

import com.engram.web.dto.NodeResponse;
import com.engram.web.dto.SmartQuery;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Evaluates a smart collection query: live pages anywhere in the base that carry
 * ALL the given tags and, optionally, a property matching a name/value. Native
 * SQL so tag-set matching stays a single query.
 */
@Service
public class SmartCollectionService {

    private static final int MAX_RESULTS = 200;

    private final JdbcClient jdbcClient;
    private final NodeService nodeService;

    public SmartCollectionService(JdbcClient jdbcClient, NodeService nodeService) {
        this.jdbcClient = jdbcClient;
        this.nodeService = nodeService;
    }

    @Transactional(readOnly = true)
    public List<NodeResponse> results(SmartQuery query) {
        if (query == null || query.isEmpty()) {
            return List.of();
        }
        StringBuilder sql = new StringBuilder("SELECT n.id AS id FROM node n WHERE n.deleted_at IS NULL");
        Map<String, Object> params = new HashMap<>();

        List<String> tags = query.tags();
        if (tags != null && !tags.isEmpty()) {
            List<String> distinct = tags.stream().map(String::trim).filter(s -> !s.isEmpty()).distinct().toList();
            if (!distinct.isEmpty()) {
                sql.append(" AND (SELECT count(DISTINCT t.name) FROM node_tag nt JOIN tag t ON t.id = nt.tag_id"
                        + " WHERE nt.node_id = n.id AND t.name IN (:tags)) = :tagCount");
                params.put("tags", distinct);
                params.put("tagCount", distinct.size());
            }
        }
        if (query.propertyName() != null && !query.propertyName().isBlank()) {
            sql.append(" AND EXISTS (SELECT 1 FROM node_property np WHERE np.node_id = n.id AND np.name = :pname");
            params.put("pname", query.propertyName().trim());
            if (query.propertyValue() != null && !query.propertyValue().isBlank()) {
                sql.append(" AND np.value LIKE :pval");
                params.put("pval", "%" + query.propertyValue().trim() + "%");
            }
            sql.append(")");
        }
        sql.append(" ORDER BY n.updated_at DESC LIMIT ").append(MAX_RESULTS);

        List<UUID> ids = jdbcClient.sql(sql.toString())
                .params(params)
                .query((rs, rowNum) -> UUID.fromString(rs.getString("id")))
                .list();
        return ids.stream().map(nodeService::get).toList();
    }
}
