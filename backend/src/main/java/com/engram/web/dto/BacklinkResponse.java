package com.engram.web.dto;

import com.engram.model.NodeKind;
import java.util.UUID;

/** A node that links to the requested node (an inbound reference). */
public record BacklinkResponse(
        UUID linkId,
        UUID nodeId,
        String title,
        NodeKind kind,
        String relType) {
}
