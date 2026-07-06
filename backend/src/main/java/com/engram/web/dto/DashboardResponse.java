package com.engram.web.dto;

import java.util.List;

/** Everything the Home dashboard shows in one shot: study, recents, questions. */
public record DashboardResponse(
        int dueCards,
        List<SubjectReview> subjects,
        List<PageRef> recent,
        List<PageRef> openQuestions,
        PageRef resurface) {
}
