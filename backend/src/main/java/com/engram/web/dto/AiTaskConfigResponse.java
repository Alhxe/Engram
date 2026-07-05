package com.engram.web.dto;

import com.engram.ai.AiProviderType;
import com.engram.ai.AiTask;

public record AiTaskConfigResponse(
        AiTask task,
        AiProviderType provider,
        String model,
        boolean enabled) {
}
