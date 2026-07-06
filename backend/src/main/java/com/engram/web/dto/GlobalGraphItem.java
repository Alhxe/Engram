package com.engram.web.dto;

import java.util.UUID;

/**
 * One page in the global graph — deliberately tiny (no content, no tags) so the
 * whole base can be sent at once, however many pages there are.
 */
public record GlobalGraphItem(UUID id, String title, UUID parentId) {
}
