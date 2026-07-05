package com.engram.web.dto;

import com.engram.ai.AiProviderType;

public record AiProviderStatus(AiProviderType provider, boolean connected) {
}
