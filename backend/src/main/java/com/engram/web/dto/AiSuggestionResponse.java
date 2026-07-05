package com.engram.web.dto;

import java.util.List;

public record AiSuggestionResponse(List<TagSuggestion> tags, List<PropertySuggestion> properties) {
}
