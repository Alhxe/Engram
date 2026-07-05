package com.engram.ai;

import java.util.List;

/** Static list of models Engram can route tasks to, with tier and pricing. */
public final class AiModelCatalog {

    private static final List<AiModelInfo> MODELS = List.of(
            // Claude (via the anthropic-java library).
            new AiModelInfo(AiProviderType.CLAUDE, "claude-haiku-4-5", "Claude Haiku 4.5", AiModelTier.CHEAP, 1.0, 5.0),
            new AiModelInfo(AiProviderType.CLAUDE, "claude-sonnet-4-6", "Claude Sonnet 4.6", AiModelTier.BALANCED, 3.0, 15.0),
            new AiModelInfo(AiProviderType.CLAUDE, "claude-opus-4-8", "Claude Opus 4.8", AiModelTier.POWERFUL, 5.0, 25.0),
            new AiModelInfo(AiProviderType.CLAUDE, "claude-fable-5", "Claude Fable 5", AiModelTier.POWERFUL, 10.0, 50.0),
            // DeepSeek (OpenAI-compatible HTTP API, no SDK needed).
            new AiModelInfo(AiProviderType.DEEPSEEK, "deepseek-chat", "DeepSeek Chat", AiModelTier.CHEAP, 0.27, 1.10),
            new AiModelInfo(AiProviderType.DEEPSEEK, "deepseek-reasoner", "DeepSeek Reasoner", AiModelTier.BALANCED, 0.55, 2.19));

    private AiModelCatalog() {
    }

    public static List<AiModelInfo> all() {
        return MODELS;
    }

    public static boolean isKnown(String modelId) {
        return MODELS.stream().anyMatch(m -> m.id().equals(modelId));
    }

    public static boolean belongsTo(AiProviderType provider, String modelId) {
        return MODELS.stream().anyMatch(m -> m.provider() == provider && m.id().equals(modelId));
    }

    public static java.util.Optional<AiModelInfo> find(AiProviderType provider, String modelId) {
        return MODELS.stream().filter(m -> m.provider() == provider && m.id().equals(modelId)).findFirst();
    }

    public static java.util.List<AiModelInfo> forProvider(AiProviderType provider) {
        return MODELS.stream().filter(m -> m.provider() == provider).toList();
    }
}
