package com.engram.web.dto;

import com.engram.model.NodeKind;
import java.time.Instant;
import java.util.UUID;

/** A trashed page shown in the trash view. */
public record TrashItem(UUID id, String title, NodeKind kind, Instant deletedAt) {
}
