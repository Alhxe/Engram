package com.engram.web.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

/** A question, optionally scoped to a page and its whole subtree. */
public record AskRequest(@NotBlank String question, UUID scopeId) {
}
