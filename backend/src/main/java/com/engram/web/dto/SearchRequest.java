package com.engram.web.dto;

import com.engram.model.NodeKind;
import java.util.List;
import java.util.UUID;

public record SearchRequest(
        String query,
        Integer page,
        Integer size,
        UUID parentId,
        List<NodeKind> kinds,
        List<String> tags) {

    public int pageOrDefault() {
        return page == null || page < 0 ? 0 : page;
    }

    public int sizeOrDefault() {
        return size == null || size < 1 || size > 100 ? 20 : size;
    }
}
