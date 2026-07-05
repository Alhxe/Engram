package com.engram.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.anthropicjava.client.AnthropicClient;
import io.github.anthropicjava.exception.AnthropicException;
import io.github.anthropicjava.exception.AuthenticationException;
import io.github.anthropicjava.model.request.MessageRequest;
import io.github.anthropicjava.model.response.MessageResponse;
import io.github.anthropicjava.model.response.Usage;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * Claude adapter over the anthropic-java client. A client is built per call
 * (keys are per-user and dynamic); the transport is lightweight enough for this.
 */
@Component
public class ClaudeProvider implements AiProvider {

    private static final Duration TIMEOUT = Duration.ofSeconds(60);
    private static final URI MODELS_ENDPOINT = URI.create("https://api.anthropic.com/v1/models?limit=100");

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();
    private final ObjectMapper mapper;

    public ClaudeProvider(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    @Override
    public AiProviderType type() {
        return AiProviderType.CLAUDE;
    }

    @Override
    public void verify(String apiKey, String baseUrl) {
        // Cheapest possible round-trip: 1-token reply on the cheap model.
        complete(new AiCompletionRequest(apiKey, "claude-haiku-4-5", null, "ping", 1, null));
    }

    @Override
    public List<String> listModels(String apiKey, String baseUrl) {
        try {
            HttpRequest request = HttpRequest.newBuilder(MODELS_ENDPOINT)
                    .timeout(TIMEOUT)
                    .header("x-api-key", apiKey)
                    .header("anthropic-version", "2023-06-01")
                    .GET()
                    .build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 401) {
                throw new AiException("Invalid Claude API key");
            }
            if (response.statusCode() >= 400) {
                throw new AiException("Claude models error " + response.statusCode());
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
            throw new AiException("Could not list Claude models: " + e.getMessage(), e);
        }
    }

    @Override
    public AiCompletionResult complete(AiCompletionRequest request) {
        try (AnthropicClient client = AnthropicClient.builder()
                .apiKey(request.apiKey())
                .timeout(TIMEOUT)
                .build()) {

            MessageRequest.Builder builder = MessageRequest.builder()
                    .model(request.model())
                    .maxTokens(request.maxTokens())
                    .addUserMessage(request.prompt());
            if (request.system() != null && !request.system().isBlank()) {
                builder.system(request.system());
            }

            MessageResponse response = client.messages().create(builder.build());
            Usage usage = response.getUsage();
            return new AiCompletionResult(
                    response.getText(),
                    usage != null ? usage.getInputTokens() : 0,
                    usage != null ? usage.getOutputTokens() : 0);

        } catch (AuthenticationException e) {
            throw new AiException("Invalid Claude API key", e);
        } catch (AnthropicException e) {
            throw new AiException(e.getMessage(), e);
        }
    }
}
