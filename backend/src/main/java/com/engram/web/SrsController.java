package com.engram.web;

import com.engram.service.SrsService;
import com.engram.service.SrsService.Grade;
import com.engram.web.dto.NodeResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Spaced-repetition review endpoints over flashcard-tagged pages. */
@RestController
@RequestMapping("/api/v1/srs")
public class SrsController {

    private final SrsService srsService;

    public SrsController(SrsService srsService) {
        this.srsService = srsService;
    }

    /** Cards due for review today (plus never-reviewed cards). Optionally
     *  scope to a page's subtree (a subject or a topic). */
    @GetMapping("/due")
    public List<NodeResponse> due(@RequestParam(required = false) UUID scope) {
        return srsService.due(scope);
    }

    /** Per-subject review counts, for the review hub. */
    @GetMapping("/summary")
    public List<com.engram.web.dto.SubjectReview> summary() {
        return srsService.summary();
    }

    /** Global study stats (card maturity + per-subject counts). */
    @GetMapping("/stats")
    public com.engram.web.dto.StatsResponse stats() {
        return srsService.stats();
    }

    /** A shuffled set of cards for a mock exam over a scope (all cards, not just due). */
    @GetMapping("/exam")
    public List<NodeResponse> exam(
            @RequestParam(required = false) UUID scope, @RequestParam(defaultValue = "10") int count) {
        return srsService.exam(scope, count);
    }

    /** Grade a card (AGAIN | HARD | GOOD | EASY) and reschedule it. */
    @PostMapping("/{id}/grade")
    public NodeResponse grade(@PathVariable UUID id, @RequestParam Grade grade) {
        return srsService.grade(id, grade);
    }
}
