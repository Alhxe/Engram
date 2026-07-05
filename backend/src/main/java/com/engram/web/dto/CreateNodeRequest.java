package com.engram.web.dto;

import com.engram.model.NodeKind;
import com.engram.model.PageLayout;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.UUID;

public record CreateNodeRequest(
        @NotBlank String title,
        String content,
        NodeKind kind,
        PageLayout layout,
        UUID parentId,
        List<String> tags) {
}
