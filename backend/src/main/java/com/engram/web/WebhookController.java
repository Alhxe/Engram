package com.engram.web;

import com.engram.security.SecurityUtils;
import com.engram.service.WebhookService;
import com.engram.web.dto.CreateWebhookRequest;
import com.engram.web.dto.WebhookResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/webhooks")
public class WebhookController {

    private final WebhookService webhookService;

    public WebhookController(WebhookService webhookService) {
        this.webhookService = webhookService;
    }

    @GetMapping
    public List<WebhookResponse> list() {
        return webhookService.list(SecurityUtils.requireUserId());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WebhookResponse create(@Valid @RequestBody CreateWebhookRequest request) {
        return webhookService.create(SecurityUtils.requireUserId(), request.url());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        webhookService.delete(SecurityUtils.requireUserId(), id);
    }
}
