package com.engram.web.dto;

import java.util.UUID;

public record SavedViewResponse(
        UUID id,
        String name,
        String mode,
        String groupBy,
        String dateBy,
        String sortCol,
        int sortDir,
        String filterText) {
}
