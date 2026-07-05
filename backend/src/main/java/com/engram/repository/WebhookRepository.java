package com.engram.repository;

import com.engram.model.Webhook;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WebhookRepository extends JpaRepository<Webhook, UUID> {

    List<Webhook> findByUserIdOrderByCreatedAtDesc(UUID userId);

    List<Webhook> findByEnabledTrue();

    Optional<Webhook> findByIdAndUserId(UUID id, UUID userId);
}
