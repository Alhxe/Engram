package com.engram.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

/**
 * Custom OpenAI-compatible adapter. The base URL is supplied per user (stored on
 * the credential), so this can talk to a local model (Ollama, LM Studio),
 * OpenRouter, Groq, or any endpoint exposing /chat/completions and /models.
 */
@Component
public class CustomProvider implements AiProvider {

    private static final Duration TIMEOUT = Duration.ofSeconds(60);

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();
    private final ObjectMapper mapper;

    public CustomProvider(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    @Override
    public AiProviderType type() {
        return AiProviderType.CUSTOM;
    }

    @Override
    public void verify(String apiKey, String baseUrl) {
        // Reachability + auth check without needing to know a model id upfront.
        listModels(apiKey, baseUrl);
    }

    @Override
    public List<String> listModels(String apiKey, String baseUrl) {
        String base = normalize(baseUrl);
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(base + "/models"))
                    .timeout(TIMEOUT)
                    .GET();
            if (apiKey != null && !apiKey.isBlank()) {
                builder.header("Authorization", "Bearer " + apiKey);
            }
            HttpResponse<String> response = http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 401 || response.statusCode() == 403) {
                throw new AiException("Custom endpoint rejected the API key");
            }
            if (response.statusCode() >= 400) {
                throw new AiException("Custom endpoint models error " + response.statusCode());
            }
            List<String> ids = new ArrayList<>();
            for (JsonNode model : mapper.readTree(response.body()).path("data")) {
                String id = model.path("id").asText("");
                if (!id.isEmpty()) {
                    ids.add(id);
                }
            }
            return ids;
        } catch (AiException e) {
            throw e;
        } catch (Exception e) {
            throw new AiException("Could not reach the custom endpoint: " + e.getMessage(), e);
        }
    }

    @Override
    public AiCompletionResult complete(AiCompletionRequest request) {
        String base = normalize(request.baseUrl());
        try {
            List<Map<String, String>> messages = new ArrayList<>();
            if (request.system() != null && !request.system().isBlank()) {
                messages.add(Map.of("role", "system", "content", request.system()));
            }
            messages.add(Map.of("role", "user", "content", request.prompt()));

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model", request.model());
            body.put("messages", messages);
            body.put("max_tokens", request.maxTokens());
            body.put("stream", false);

            HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(base + "/chat/completions"))
                    .timeout(TIMEOUT)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(
                            mapper.writeValueAsString(body), StandardCharsets.UTF_8));
            if (request.apiKey() != null && !request.apiKey().isBlank()) {
                builder.header("Authorization", "Bearer " + request.apiKey());
            }

            HttpResponse<String> response = http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 401 || response.statusCode() == 403) {
                throw new AiException("Custom endpoint rejected the API key");
            }
            if (response.statusCode() >= 400) {
                throw new AiException("Custom endpoint error " + response.statusCode() + ": " + errorMessage(response.body()));
            }

            JsonNode root = mapper.readTree(response.body());
            String text = root.path("choices").path(0).path("message").path("content").asText("");
            JsonNode usage = root.path("usage");
            return new AiCompletionResult(
                    text,
                    usage.path("prompt_tokens").asInt(0),
                    usage.path("completion_tokens").asInt(0));

        } catch (AiException e) {
            throw e;
        } catch (java.io.InterruptedIOException e) {
            Thread.currentThread().interrupt();
            throw new AiException("Custom endpoint request timed out", e);
        } catch (Exception e) {
            throw new AiException("Custom endpoint request failed: " + e.getMessage(), e);
        }
    }

    private String normalize(String baseUrl) {
        if (baseUrl == null || baseUrl.isBlank()) {
            throw new AiException("A base URL is required for the custom provider");
        }
        String trimmed = baseUrl.trim();
        while (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }
        return trimmed;
    }

    private String errorMessage(String responseBody) {
        try {
            return mapper.readTree(responseBody).path("error").path("message").asText(responseBody);
        } catch (Exception e) {
            return responseBody;
        }
    }
}
