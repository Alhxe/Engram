package com.engram.web.dto;

import com.engram.model.PageLayout;
import java.util.UUID;

/** A lightweight page reference (id + title + layout) for lists and dashboards. */
public record PageRef(UUID id, String title, PageLayout layout) {
}
