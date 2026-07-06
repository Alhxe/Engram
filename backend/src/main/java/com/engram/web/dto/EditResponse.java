package com.engram.web.dto;

import java.util.List;
import java.util.UUID;

/**
 * The AI's proposed new HTML for a page, shown for preview before the user applies it.
 * {@code linkedIds} are the pages the new content references inline; the client turns
 * them into links only if (and when) the user applies the edit.
 */
public record EditResponse(String html, List<UUID> linkedIds) {
}
