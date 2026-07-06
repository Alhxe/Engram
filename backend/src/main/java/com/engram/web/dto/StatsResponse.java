package com.engram.web.dto;

import java.util.List;

/** Study stats: total flashcards split by maturity, how many are due, per subject. */
public record StatsResponse(
        int total,
        int unseen,
        int learning,
        int mature,
        int due,
        List<SubjectReview> subjects) {
}
