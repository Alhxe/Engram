package com.engram.web.dto;

import java.util.List;

public record AiSettingsResponse(
        List<AiProviderStatus> providers,
        List<AiTaskConfigResponse> tasks,
        List<AiModelResponse> models) {
}
