package com.engram.service;

import com.engram.ai.AiCompletionRequest;
import com.engram.ai.AiCompletionResult;
import com.engram.ai.AiException;
import com.engram.ai.AiModelCatalog;
import com.engram.ai.AiModelInfo;
import com.engram.ai.AiProvider;
import com.engram.ai.AiProviderType;
import com.engram.ai.AiTask;
import com.engram.model.AiCredential;
import com.engram.model.AiTaskModel;
import com.engram.repository.AiCredentialRepository;
import com.engram.repository.AiTaskModelRepository;
import com.engram.repository.AppUserRepository;
import com.engram.security.SecretCipher;
import com.engram.web.dto.AiModelResponse;
import com.engram.web.dto.AiProviderStatus;
import com.engram.web.dto.AiSettingsResponse;
import com.engram.web.dto.AiTaskConfigResponse;
import java.time.Instant;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Central AI facade: stores per-user credentials and per-task model routing,
 * and runs completions by resolving the right provider + model for a task.
 */
@Service
public class AiService {

    private final AiCredentialRepository credentialRepository;
    private final AiTaskModelRepository taskModelRepository;
    private final AppUserRepository userRepository;
    private final SecretCipher cipher;
    private final AiUsageService usageService;
    private final Map<AiProviderType, AiProvider> providers;

    public AiService(AiCredentialRepository credentialRepository,
                     AiTaskModelRepository taskModelRepository,
                     AppUserRepository userRepository,
                     SecretCipher cipher,
                     AiUsageService usageService,
                     List<AiProvider> providerList) {
        this.credentialRepository = credentialRepository;
        this.taskModelRepository = taskModelRepository;
        this.userRepository = userRepository;
        this.cipher = cipher;
        this.usageService = usageService;
        this.providers = new EnumMap<>(AiProviderType.class);
        providerList.forEach(p -> this.providers.put(p.type(), p));
    }

    // --- Settings -----------------------------------------------------------

    @Transactional(readOnly = true)
    public AiSettingsResponse settings(UUID userId) {
        List<AiProviderStatus> providerStatuses = java.util.Arrays.stream(AiProviderType.values())
                .map(type -> new AiProviderStatus(
                        type, credentialRepository.findByUserIdAndProvider(userId, type).isPresent()))
                .toList();

        Map<AiTask, AiTaskModel> configured = new EnumMap<>(AiTask.class);
        taskModelRepository.findByUserId(userId).forEach(row -> configured.put(row.getTask(), row));

        List<AiTaskConfigResponse> tasks = java.util.Arrays.stream(AiTask.values())
                .map(task -> {
                    AiTaskModel row = configured.get(task);
                    if (row != null) {
                        return new AiTaskConfigResponse(task, row.getProvider(), row.getModel(), row.isEnabled());
                    }
                    return new AiTaskConfigResponse(task, AiProviderType.CLAUDE, task.defaultModel(), true);
                })
                .toList();

        List<AiModelResponse> models = new java.util.ArrayList<>();
        for (AiProviderType type : AiProviderType.values()) {
            var credential = credentialRepository.findByUserIdAndProvider(userId, type);
            List<String> ids = null;
            if (credential.isPresent()) {
                try {
                    ids = provider(type).listModels(
                            cipher.decrypt(credential.get().getApiKeyEncrypted()), credential.get().getBaseUrl());
                } catch (RuntimeException e) {
                    ids = null; // fall back to the static catalog on any failure
                }
            }
            if (ids == null || ids.isEmpty()) {
                AiModelCatalog.forProvider(type).forEach(m -> models.add(toModelResponse(m)));
            } else {
                for (String id : ids) {
                    AiModelCatalog.find(type, id)
                            .ifPresentOrElse(
                                    info -> models.add(toModelResponse(info)),
                                    () -> models.add(new AiModelResponse(type, id, id, "UNKNOWN", 0.0, 0.0)));
                }
            }
        }

        return new AiSettingsResponse(providerStatuses, tasks, models);
    }

    @Transactional
    public void saveCredential(UUID userId, AiProviderType provider, String apiKey, String baseUrl) {
        String url = provider == AiProviderType.CUSTOM ? trimToNull(baseUrl) : null;
        if (provider == AiProviderType.CUSTOM && url == null) {
            throw new AiException("A base URL is required for the custom provider");
        }
        String key = apiKey == null ? "" : apiKey.trim();
        if (provider != AiProviderType.CUSTOM && key.isEmpty()) {
            throw new AiException("An API key is required");
        }
        provider(provider).verify(key, url);
        AiCredential credential = credentialRepository.findByUserIdAndProvider(userId, provider)
                .orElseGet(() -> {
                    AiCredential created = new AiCredential();
                    created.setUser(requireUser(userId));
                    created.setProvider(provider);
                    created.setCreatedAt(Instant.now());
                    return created;
                });
        credential.setApiKeyEncrypted(cipher.encrypt(key));
        credential.setBaseUrl(url);
        credential.setUpdatedAt(Instant.now());
        credentialRepository.saveAndFlush(credential);
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    @Transactional
    public void deleteCredential(UUID userId, AiProviderType provider) {
        credentialRepository.deleteByUserIdAndProvider(userId, provider);
    }

    @Transactional
    public void setTaskModel(UUID userId, AiTask task, AiProviderType provider, String model, boolean enabled) {
        // Models are discovered dynamically per provider, so accept any non-blank id;
        // the provider will reject a truly invalid model at call time.
        if (model == null || model.isBlank()) {
            throw new AiException("A model is required");
        }
        AiTaskModel row = taskModelRepository.findByUserIdAndTask(userId, task)
                .orElseGet(() -> {
                    AiTaskModel created = new AiTaskModel();
                    created.setUser(requireUser(userId));
                    created.setTask(task);
                    return created;
                });
        row.setProvider(provider);
        row.setModel(model);
        row.setEnabled(enabled);
        taskModelRepository.saveAndFlush(row);
    }

    @Transactional(readOnly = true)
    public void testConnection(UUID userId, AiProviderType provider) {
        AiCredential credential = credentialRepository.findByUserIdAndProvider(userId, provider)
                .orElseThrow(() -> new AiException("No credential configured for " + provider));
        provider(provider).verify(cipher.decrypt(credential.getApiKeyEncrypted()), credential.getBaseUrl());
    }

    // --- Execution (used by AI-backed features) -----------------------------

    /** Resolve the model/provider for a task and run a completion. */
    @Transactional(readOnly = true)
    public AiCompletionResult run(UUID userId, AiTask task, String system, String prompt, int maxTokens) {
        AiTaskModel row = taskModelRepository.findByUserIdAndTask(userId, task).orElse(null);
        AiProviderType providerType = row != null ? row.getProvider() : AiProviderType.CLAUDE;
        String model = row != null ? row.getModel() : task.defaultModel();
        if (row != null && !row.isEnabled()) {
            throw new AiException("AI task is disabled: " + task);
        }
        AiCredential credential = credentialRepository.findByUserIdAndProvider(userId, providerType)
                .orElseThrow(() -> new AiException("No credential configured for " + providerType));
        String apiKey = cipher.decrypt(credential.getApiKeyEncrypted());
        AiCompletionResult result = provider(providerType)
                .complete(new AiCompletionRequest(apiKey, model, system, prompt, maxTokens, credential.getBaseUrl()));
        usageService.record(userId, task, providerType, model, result.inputTokens(), result.outputTokens());
        return result;
    }

    // --- Internals ----------------------------------------------------------

    private com.engram.model.AppUser requireUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new AiException("Your session is no longer valid — sign out and sign in again."));
    }

    private AiProvider provider(AiProviderType type) {
        AiProvider provider = providers.get(type);
        if (provider == null) {
            throw new AiException("Provider not available: " + type);
        }
        return provider;
    }

    private static AiModelResponse toModelResponse(AiModelInfo info) {
        return new AiModelResponse(
                info.provider(), info.id(), info.label(), info.tier().name(),
                info.inputPricePerMillion(), info.outputPricePerMillion());
    }
}
