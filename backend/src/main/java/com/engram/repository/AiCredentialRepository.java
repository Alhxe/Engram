package com.engram.repository;

import com.engram.ai.AiProviderType;
import com.engram.model.AiCredential;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiCredentialRepository extends JpaRepository<AiCredential, UUID> {

    Optional<AiCredential> findByUserIdAndProvider(UUID userId, AiProviderType provider);

    List<AiCredential> findByUserId(UUID userId);

    void deleteByUserIdAndProvider(UUID userId, AiProviderType provider);
}
