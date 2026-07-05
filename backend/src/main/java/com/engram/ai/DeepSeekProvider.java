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
 * DeepSeek adapter. DeepSeek has no Java SDK, but its API is OpenAI-compatible,
 * so this is a thin HTTP client — no extra dependency needed.
 */
@Component
public class DeepSeekProvider implements AiProvider {

    private static final URI ENDPOINT = URI.create("https://api.deepseek.com/chat/completions");
    private static final Duration TIMEOUT = Duration.ofSeconds(60);

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();
    private final ObjectMapper mapper;

    public DeepSeekProvider(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    @Override
    public AiProviderType type() {
        return AiProviderType.DEEPSEEK;
    }

    private static final URI MODELS_ENDPOINT = URI.create("https://api.deepseek.com/models");

    @Override
    public void verify(String apiKey, String baseUrl) {
        complete(new AiCompletionRequest(apiKey, "deepseek-chat", null, "ping", 1, null));
    }

    @Override
    public java.util.List<String> listModels(String apiKey, String baseUrl) {
        try {
            HttpRequest request = HttpRequest.newBuilder(MODELS_ENDPOINT)
                    .timeout(TIMEOUT)
                    .header("Authorization", "Bearer " + apiKey)
                    .GET()
                    .build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 401) {
                throw new AiException("Invalid DeepSeek API key");
            }
            if (response.statusCode() >= 400) {
                throw new AiException("DeepSeek models error " + response.statusCode());
            }
            java.util.List<String> ids = new java.util.ArrayList<>();
            for (com.fasterxml.jackson.databind.JsonNode model : mapper.readTree(response.body()).path("data")) {
                String id = model.path("id").asText("");
                if (!id.isEmpty()) {
                    ids.add(id);
                }
            }
            return ids;
        } catch (AiException e) {
            throw e;
        } catch (Exception e) {
            throw new AiException("Could not list DeepSeek models: " + e.getMessage(), e);
        }
    }

    @Override
    public AiCompletionResult complete(AiCompletionRequest request) {
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

            HttpRequest httpRequest = HttpRequest.newBuilder(ENDPOINT)
                    .timeout(TIMEOUT)
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + request.apiKey())
                    .POST(HttpRequest.BodyPublishers.ofString(
                            mapper.writeValueAsString(body), StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = http.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 401) {
                throw new AiException("Invalid DeepSeek API key");
            }
            if (response.statusCode() >= 400) {
                throw new AiException("DeepSeek error " + response.statusCode() + ": " + errorMessage(response.body()));
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
            throw new AiException("DeepSeek request timed out", e);
        } catch (Exception e) {
            throw new AiException("DeepSeek request failed: " + e.getMessage(), e);
        }
    }

    private String errorMessage(String responseBody) {
        try {
            return mapper.readTree(responseBody).path("error").path("message").asText(responseBody);
        } catch (Exception e) {
            return responseBody;
        }
    }
}
