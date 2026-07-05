package com.engram.web.dto;

import java.util.UUID;

/** A tag matching the search query, with how many pages use it. */
public record TagHit(UUID id, String name, long count) {
}
