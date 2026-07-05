package com.engram.web.dto;

import com.engram.ai.AiTask;

public record AiUsageRow(
        AiTask task,
        long calls,
        long inputTokens,
        long outputTokens,
        double costUsd) {
}
