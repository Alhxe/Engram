package com.engram.service;

import com.engram.model.Webhook;
import com.engram.repository.AppUserRepository;
import com.engram.repository.WebhookRepository;
import com.engram.web.dto.WebhookResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Manages outbound webhooks and fires them when pages change. */
@Service
public class WebhookService {

    private final WebhookRepository webhookRepository;
    private final AppUserRepository userRepository;
    private final ObjectMapper mapper;
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    public WebhookService(WebhookRepository webhookRepository, AppUserRepository userRepository, ObjectMapper mapper) {
        this.webhookRepository = webhookRepository;
        this.userRepository = userRepository;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<WebhookResponse> list(UUID userId) {
        return webhookRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(WebhookService::toResponse)
                .toList();
    }

    @Transactional
    public WebhookResponse create(UUID userId, String url) {
        Webhook webhook = new Webhook();
        webhook.setUserId(userId);
        webhook.setUrl(url.trim());
        return toResponse(webhookRepository.saveAndFlush(webhook));
    }

    @Transactional
    public void delete(UUID userId, UUID id) {
        webhookRepository.findByIdAndUserId(id, userId).ifPresent(webhookRepository::delete);
    }

    @EventListener
    public void onNodeChange(NodeChangeEvent event) {
        List<Webhook> webhooks = webhookRepository.findByEnabledTrue();
        if (webhooks.isEmpty()) {
            return;
        }
        String body;
        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("event", event.event());
            payload.put("nodeId", event.nodeId());
            payload.put("title", event.title());
            body = mapper.writeValueAsString(payload);
        } catch (Exception e) {
            return;
        }
        for (Webhook webhook : webhooks) {
            try {
                HttpRequest request = HttpRequest.newBuilder(URI.create(webhook.getUrl()))
                        .timeout(Duration.ofSeconds(10))
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofString(body))
                        .build();
                http.sendAsync(request, HttpResponse.BodyHandlers.discarding())
                        .exceptionally(ex -> null);
            } catch (RuntimeException ignored) {
                // Bad URL etc. — never let a webhook break the main flow.
            }
        }
    }

    private static WebhookResponse toResponse(Webhook webhook) {
        return new WebhookResponse(webhook.getId(), webhook.getUrl(), webhook.isEnabled(), webhook.getCreatedAt());
    }
}
