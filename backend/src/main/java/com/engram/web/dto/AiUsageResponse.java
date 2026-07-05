package com.engram.web.dto;

import java.util.List;

/** AI spend so far: totals plus a per-task breakdown. */
public record AiUsageResponse(
        List<AiUsageRow> byTask,
        long totalInputTokens,
        long totalOutputTokens,
        double totalCostUsd) {
}
