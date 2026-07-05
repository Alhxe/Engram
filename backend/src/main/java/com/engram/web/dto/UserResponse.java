package com.engram.web.dto;

import com.engram.model.UserRole;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String username,
        String email,
        UserRole role) {
}
