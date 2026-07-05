package com.engram.web.dto;

import jakarta.validation.constraints.NotBlank;

/** An instruction for the AI to rewrite an existing page's content. */
public record EditRequest(@NotBlank String instruction) {
}
