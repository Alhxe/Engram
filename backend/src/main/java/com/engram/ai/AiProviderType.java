package com.engram.ai;

/** AI providers Engram can talk to. The seam is here to add more. */
public enum AiProviderType {
    CLAUDE,
    DEEPSEEK,
    /** Any OpenAI-compatible endpoint (local model, OpenRouter, Groq, …) with a user-set base URL. */
    CUSTOM
}
