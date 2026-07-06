package com.engram.web.dto;

import java.util.UUID;

/** Review counts for one subject: cards due now and total cards in its subtree. */
public record SubjectReview(UUID id, String title, int due, int total) {
}
