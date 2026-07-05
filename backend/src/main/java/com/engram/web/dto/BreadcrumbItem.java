package com.engram.web.dto;

import java.util.UUID;

public record BreadcrumbItem(
        UUID id,
        String title) {
}
