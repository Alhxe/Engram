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

    /** Cards due for review today (plus never-reviewed cards). */
    @GetMapping("/due")
    public List<NodeResponse> due() {
        return srsService.due();
    }

    /** Grade a card (AGAIN | HARD | GOOD | EASY) and reschedule it. */
    @PostMapping("/{id}/grade")
    public NodeResponse grade(@PathVariable UUID id, @RequestParam Grade grade) {
        return srsService.grade(id, grade);
    }
}
