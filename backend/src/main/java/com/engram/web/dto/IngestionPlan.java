package com.engram.web.dto;

import java.util.List;

/** The AI's proposed set of pages for a document, shown for preview before commit. */
public record IngestionPlan(List<PlannedPage> pages) {
}
