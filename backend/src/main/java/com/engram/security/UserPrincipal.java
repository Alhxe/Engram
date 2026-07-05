package com.engram.security;

import java.util.UUID;

/**
 * Authenticated principal. {@code userId} is null for user-less API keys (keys
 * created before ownership, or system keys).
 */
public record UserPrincipal(UUID userId, String username) {
}
