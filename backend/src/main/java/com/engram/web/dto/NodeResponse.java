package com.engram.web.dto;

import com.engram.model.NodeKind;
import com.engram.model.PageLayout;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record NodeResponse(
        UUID id,
        String title,
        String content,
        NodeKind kind,
        PageLayout layout,
        UUID parentId,
        boolean hasChildren,
        boolean favorite,
        boolean template,
        String shareToken,
        List<SchemaField> schema,
        SmartQuery smartQuery,
        List<String> tags,
        List<PropertyDto> properties,
        Double mapX,
        Double mapY,
        String mapColor,
        Instant createdAt,
        Instant updatedAt) {
}
