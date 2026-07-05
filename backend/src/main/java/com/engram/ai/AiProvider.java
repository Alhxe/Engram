package com.engram.ai;

/**
 * The dependency-inversion seam for AI: how a text completion is produced.
 * Concrete adapters (Claude today, others later) implement this; the rest of
 * the app depends only on this interface.
 */
public interface AiProvider {

    /** Which provider this adapter serves. */
    AiProviderType type();

    /** Verify a key is usable, throwing {@link AiException} if not. {@code baseUrl}
     *  is only meaningful for providers with a configurable endpoint (CUSTOM). */
    void verify(String apiKey, String baseUrl);

    /** List the model ids this key can access (queried from the provider's API). */
    java.util.List<String> listModels(String apiKey, String baseUrl);

    /** Run a single text completion. */
    AiCompletionResult complete(AiCompletionRequest request);
}
