package com.engram.web;

import com.engram.security.SecurityUtils;
import com.engram.service.ApiKeyService;
import com.engram.web.dto.ApiKeyResponse;
import com.engram.web.dto.CreateApiKeyRequest;
import com.engram.web.dto.CreateApiKeyResult;
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
@RequestMapping("/api/v1/api-keys")
public class ApiKeyController {

    private final ApiKeyService apiKeyService;

    public ApiKeyController(ApiKeyService apiKeyService) {
        this.apiKeyService = apiKeyService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CreateApiKeyResult create(@Valid @RequestBody CreateApiKeyRequest request) {
        return apiKeyService.create(SecurityUtils.requireUserId(), request);
    }

    @GetMapping
    public List<ApiKeyResponse> list() {
        return apiKeyService.list(SecurityUtils.requireUserId());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revoke(@PathVariable UUID id) {
        apiKeyService.revoke(SecurityUtils.requireUserId(), id);
    }
}
