package com.engram.web.dto;

import com.engram.model.PageLayout;
import java.util.List;

/** One page the AI proposes to create during ingestion (not yet persisted). */
public record PlannedPage(
        String title,
        String html,
        PageLayout layout,
        List<String> tags,
        List<PlannedProperty> properties,
        List<String> linkTitles) {
}
