package com.engram.web.dto;

import java.util.List;

/** Data-hygiene report: pages worth revisiting. */
public record HygieneResponse(
        List<NodeTreeItem> orphans,
        List<NodeTreeItem> untagged,
        List<NodeTreeItem> stale) {
}
