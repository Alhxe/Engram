package com.engram.service;

import com.engram.model.ApiKey;
import com.engram.model.ApiKeyScope;
import com.engram.repository.ApiKeyRepository;
import com.engram.repository.AppUserRepository;
import com.engram.security.HashUtil;
import com.engram.web.dto.ApiKeyResponse;
import com.engram.web.dto.CreateApiKeyRequest;
import com.engram.web.dto.CreateApiKeyResult;
import com.engram.web.error.NotFoundException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ApiKeyService {

    private final ApiKeyRepository apiKeyRepository;
    private final AppUserRepository userRepository;
    private final SecureRandom random = new SecureRandom();

    public ApiKeyService(ApiKeyRepository apiKeyRepository, AppUserRepository userRepository) {
        this.apiKeyRepository = apiKeyRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public CreateApiKeyResult create(UUID userId, CreateApiKeyRequest request) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = "engram_" + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        ApiKey key = new ApiKey();
        key.setName(request.name().trim());
        key.setKeyHash(HashUtil.sha256Hex(token));
        key.setScope(request.scope() != null ? request.scope() : ApiKeyScope.READ);
        key.setUser(userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Your session is no longer valid — sign out and sign in again.")));
        if (request.expiresInDays() != null && request.expiresInDays() > 0) {
            key.setExpiresAt(Instant.now().plus(request.expiresInDays(), ChronoUnit.DAYS));
        }
        key = apiKeyRepository.saveAndFlush(key);

        return new CreateApiKeyResult(token, toResponse(key));
    }

    @Transactional(readOnly = true)
    public List<ApiKeyResponse> list(UUID userId) {
        return apiKeyRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(ApiKeyService::toResponse)
                .toList();
    }

    @Transactional
    public void revoke(UUID userId, UUID keyId) {
        ApiKey key = apiKeyRepository.findByIdAndUserId(keyId, userId)
                .orElseThrow(() -> new NotFoundException("API key not found: " + keyId));
        apiKeyRepository.delete(key);
    }

    private static ApiKeyResponse toResponse(ApiKey key) {
        return new ApiKeyResponse(
                key.getId(), key.getName(), key.getScope(),
                key.getCreatedAt(), key.getExpiresAt(), key.getLastUsedAt(), key.isRevoked());
    }
}
