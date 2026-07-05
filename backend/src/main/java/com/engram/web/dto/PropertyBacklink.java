package com.engram.web.dto;

import java.util.UUID;

/** A page that references the requested page through one of its RELATION properties. */
public record PropertyBacklink(UUID nodeId, String title, String propertyName) {
}
