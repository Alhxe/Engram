package com.engram.web.dto;

import com.engram.model.NodeKind;
import java.util.UUID;

/** A page matching the search, with flags for why it matched (for UI badges). */
public record SearchHit(
        UUID nodeId,
        String title,
        String snippet,
        NodeKind kind,
        boolean titleMatch,
        boolean tagMatch,
        boolean propertyMatch) {
}
