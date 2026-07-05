package com.engram.web.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public record ClipRequest(@NotBlank String url, UUID parentId) {
}
