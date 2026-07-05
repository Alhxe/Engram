package com.engram.web.dto;

public record AuthResponse(
        String token,
        String username) {
}
