package com.engram.ai;

/**
 * Distinct AI jobs in the app. Each can be routed to a different model, so a
 * cheap model can handle tagging while a stronger one handles ingestion.
 */
public enum AiTask {

    TAG_SUGGESTION("claude-haiku-4-5"),
    PROPERTY_SUGGESTION("claude-haiku-4-5"),
    INGESTION("claude-sonnet-4-6"),
    LINKING("claude-haiku-4-5"),
    ASK("claude-sonnet-4-6"),
    SUMMARIZE("claude-haiku-4-5");

    private final String defaultModel;

    AiTask(String defaultModel) {
        this.defaultModel = defaultModel;
    }

    public String defaultModel() {
        return defaultModel;
    }
}
