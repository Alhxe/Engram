package com.engram.service;

import com.engram.model.PropertyType;
import com.engram.repository.NodePropertyRepository;
import com.engram.repository.NodeRepository;
import com.engram.web.dto.NodeResponse;
import com.engram.web.dto.PropertyDto;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Spaced-repetition review over flashcards. A flashcard is any page tagged
 * {@code flashcard}: its title is the question, its content the answer. Review
 * state is stored as ordinary typed properties (so it shows in the UI and the
 * substrate stays uniform): "Repaso" (next-due DATE), "Intervalo" (days) and
 * "Facilidad" (SM-2 ease factor).
 */
@Service
public class SrsService {

    static final String CARD_TAG = "flashcard";
    static final String DUE = "Repaso";
    static final String INTERVAL = "Intervalo";
    static final String EASE = "Facilidad";
    private static final double DEFAULT_EASE = 2.5;
    private static final double MIN_EASE = 1.3;

    public enum Grade { AGAIN, HARD, GOOD, EASY }

    private final NodeRepository nodeRepository;
    private final NodePropertyRepository propertyRepository;
    private final NodeService nodeService;

    public SrsService(NodeRepository nodeRepository,
                      NodePropertyRepository propertyRepository,
                      NodeService nodeService) {
        this.nodeRepository = nodeRepository;
        this.propertyRepository = propertyRepository;
        this.nodeService = nodeService;
    }

    /** Cards due today (or never reviewed), soonest first; new cards lead. */
    @Transactional(readOnly = true)
    public List<NodeResponse> due() {
        String today = LocalDate.now().toString();
        return nodeRepository.findByTagName(CARD_TAG).stream()
                .filter(card -> {
                    String due = prop(card.getId(), DUE);
                    return due == null || due.isBlank() || due.compareTo(today) <= 0;
                })
                .sorted(Comparator.comparing(card -> {
                    String due = prop(card.getId(), DUE);
                    return due == null ? "" : due; // ISO dates sort chronologically; new ("") first
                }))
                .map(card -> nodeService.get(card.getId()))
                .toList();
    }

    /** Grade a card and schedule its next review (Anki-style SM-2 variant). */
    @Transactional
    public NodeResponse grade(UUID id, Grade grade) {
        double ease = number(id, EASE, DEFAULT_EASE);
        int prev = (int) number(id, INTERVAL, 0);
        int interval;
        switch (grade) {
            case AGAIN -> {
                ease = Math.max(MIN_EASE, ease - 0.20);
                interval = 0; // stays in today's queue
            }
            case HARD -> {
                ease = Math.max(MIN_EASE, ease - 0.15);
                interval = Math.max(1, (int) Math.round(Math.max(prev, 1) * 1.2));
            }
            case GOOD -> interval = prev <= 0 ? 1 : (prev == 1 ? 3 : (int) Math.round(prev * ease));
            case EASY -> {
                ease = ease + 0.15;
                interval = prev <= 0 ? 4 : (int) Math.round(prev * ease * 1.3);
            }
            default -> throw new IllegalArgumentException("Unknown grade");
        }
        LocalDate nextDue = LocalDate.now().plusDays(Math.max(interval, 0));
        nodeService.upsertProperty(id, new PropertyDto(INTERVAL, PropertyType.NUMBER, String.valueOf(interval)));
        nodeService.upsertProperty(id, new PropertyDto(EASE, PropertyType.NUMBER, String.valueOf(Math.round(ease * 100) / 100.0)));
        return nodeService.upsertProperty(id, new PropertyDto(DUE, PropertyType.DATE, nextDue.toString()));
    }

    private String prop(UUID nodeId, String name) {
        return propertyRepository.findByNodeIdAndName(nodeId, name).map(p -> p.getValue()).orElse(null);
    }

    private double number(UUID nodeId, String name, double fallback) {
        String raw = prop(nodeId, name);
        if (raw == null || raw.isBlank()) {
            return fallback;
        }
        try {
            return Double.parseDouble(raw.trim());
        } catch (NumberFormatException e) {
            return fallback;
        }
    }
}
