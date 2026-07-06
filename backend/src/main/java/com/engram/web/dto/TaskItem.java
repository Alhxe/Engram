package com.engram.web.dto;

import java.util.UUID;

/** One open to-do found in a page's content, with a link back to its page. */
public record TaskItem(UUID pageId, String pageTitle, String text, boolean done) {
}
