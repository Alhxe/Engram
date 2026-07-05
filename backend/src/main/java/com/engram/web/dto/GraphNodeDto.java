package com.engram.web.dto;

import java.util.UUID;

/** A node in a page's local connection graph; {@code center} marks the page itself. */
public record GraphNodeDto(UUID id, String title, boolean center) {
}
