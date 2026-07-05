package com.engram.web.dto;

import java.util.List;

/** An answer grounded in the user's notes, with the sources it cited. */
public record AskResponse(String answer, List<AskSource> sources) {
}
