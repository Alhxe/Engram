package com.engram.web.dto;

import java.util.UUID;

/** Move a page to a new parent (null = root). Only the parent changes. */
public record MoveNodeRequest(
        UUID parentId) {
}
