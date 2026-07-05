package com.engram.web.dto;

import java.util.UUID;

/** A note cited as a source in an answer; {@code index} matches the [n] marker. */
public record AskSource(int index, UUID nodeId, String title) {
}
