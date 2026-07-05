package com.engram.web.dto;

import java.util.UUID;

/** A page that mentions this page's title in its text but doesn't link to it yet. */
public record UnlinkedMention(UUID nodeId, String title) {
}
