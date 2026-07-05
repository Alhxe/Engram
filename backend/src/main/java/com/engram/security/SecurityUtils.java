package com.engram.security;

import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtils {

    private SecurityUtils() {
    }

    public static UserPrincipal currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            return principal;
        }
        throw new IllegalStateException("No authenticated principal");
    }

    /** The current user's id, requiring a real user account (not an API key). */
    public static UUID requireUserId() {
        UUID userId = currentUser().userId();
        if (userId == null) {
            throw new IllegalArgumentException("This endpoint requires a user account, not an API key");
        }
        return userId;
    }
}
