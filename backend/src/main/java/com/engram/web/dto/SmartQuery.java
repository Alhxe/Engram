package com.engram.web.dto;

import java.util.List;

/**
 * Definition of a smart collection: pages (anywhere) that carry ALL the given
 * tags and, optionally, a property matching name/value. Empty = not a smart page.
 */
public record SmartQuery(List<String> tags, String propertyName, String propertyValue) {

    public boolean isEmpty() {
        boolean noTags = tags == null || tags.isEmpty();
        boolean noProp = propertyName == null || propertyName.isBlank();
        return noTags && noProp;
    }
}
