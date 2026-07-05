package com.engram.repository;

import com.engram.model.ApiKey;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ApiKeyRepository extends JpaRepository<ApiKey, UUID> {

    Optional<ApiKey> findByKeyHashAndRevokedFalse(String keyHash);

    @Query("select k from ApiKey k left join fetch k.user where k.keyHash = :keyHash and k.revoked = false")
    Optional<ApiKey> findActiveWithUser(String keyHash);

    List<ApiKey> findByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<ApiKey> findByIdAndUserId(UUID id, UUID userId);
}
