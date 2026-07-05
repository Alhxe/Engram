package com.engram.service;

import java.util.UUID;

/** A note pulled from retrieval, used to build the grounding context for an answer. */
public record RetrievedNote(UUID id, String title, String content) {
}
