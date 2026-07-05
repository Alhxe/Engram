package com.engram.web.dto;

import java.util.List;

/** Search results: matching tags (to pivot on) and matching pages. */
public record SearchResponse(List<TagHit> tags, PageResponse<SearchHit> pages) {
}
