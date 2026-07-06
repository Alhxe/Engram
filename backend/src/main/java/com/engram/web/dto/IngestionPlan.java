package com.engram.web.dto;

import java.util.List;
import java.util.UUID;

/**
 * The AI's proposed set of pages for a document, shown for preview before commit.
 * {@code suggestedParentTitle}/{@code suggestedParentId} point at the existing page
 * the AI thinks this content belongs under (null if none / not resolvable); the user
 * can override the destination before committing.
 */
public record IngestionPlan(List<PlannedPage> pages, String suggestedParentTitle, UUID suggestedParentId) {
}
