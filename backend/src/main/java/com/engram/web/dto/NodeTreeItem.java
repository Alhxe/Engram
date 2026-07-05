package com.engram.web.dto;

import com.engram.model.NodeKind;
import com.engram.model.PageLayout;
import java.util.UUID;

/** Lightweight node for the sidebar page tree (children loaded on demand). */
public record NodeTreeItem(
        UUID id,
        String title,
        NodeKind kind,
        PageLayout layout,
        boolean hasChildren) {
}
