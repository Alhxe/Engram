package com.engram.web.dto;

/** The raw key is returned only once, at creation time. */
public record CreateApiKeyResult(
        String key,
        ApiKeyResponse apiKey) {
}
