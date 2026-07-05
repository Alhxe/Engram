package com.engram.web.dto;

import java.util.List;
import java.util.UUID;

/** New sibling order for a set of pages (drag & drop). */
public record ReorderRequest(List<UUID> orderedIds) {}
