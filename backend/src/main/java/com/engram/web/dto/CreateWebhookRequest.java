package com.engram.web.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateWebhookRequest(@NotBlank String url) {
}
