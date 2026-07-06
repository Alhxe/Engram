package com.engram.service;

import com.engram.model.Node;
import com.engram.model.PropertyType;
import com.engram.repository.NodePropertyRepository;
import com.engram.repository.NodeRepository;
import com.engram.web.dto.NodeResponse;
import com.engram.web.dto.PropertyDto;
import java.time.LocalDate;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Deque;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
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
    private final AcademiaService academiaService;

    public SrsService(NodeRepository nodeRepository,
                      NodePropertyRepository propertyRepository,
                      NodeService nodeService,
                      AcademiaService academiaService) {
        this.nodeRepository = nodeRepository;
        this.propertyRepository = propertyRepository;
        this.nodeService = nodeService;
        this.academiaService = academiaService;
    }

    /** Per-subject review counts (due + total cards) for the review hub. */
    @Transactional(readOnly = true)
    public List<com.engram.web.dto.SubjectReview> summary() {
        String today = LocalDate.now().toString();
        List<Node> cards = nodeRepository.findByTagName(CARD_TAG);
        List<com.engram.web.dto.SubjectReview> out = new ArrayList<>();
        for (NodeResponse subject : academiaService.subjects()) {
            Set<UUID> scope = descendants(subject.id());
            int total = 0;
            int due = 0;
            for (Node card : cards) {
                if (!scope.contains(card.getId())) {
                    continue;
                }
                total++;
                String d = prop(card.getId(), DUE);
                if (d == null || d.isBlank() || d.compareTo(today) <= 0) {
                    due++;
                }
            }
            out.add(new com.engram.web.dto.SubjectReview(subject.id(), subject.title(), due, total));
        }
        return out;
    }

    /**
     * Cards due today (or never reviewed), soonest first; new cards lead.
     * When {@code scopeId} is given, only cards within that page's subtree are
     * returned — so you can review one subject or one topic instead of all.
     */
    @Transactional(readOnly = true)
    public List<NodeResponse> due(UUID scopeId) {
        String today = LocalDate.now().toString();
        Set<UUID> scope = scopeId == null ? null : descendants(scopeId);
        return nodeRepository.findByTagName(CARD_TAG).stream()
                .filter(card -> scope == null || scope.contains(card.getId()))
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

    /** All descendant ids of a page (its whole subtree, excluding itself). */
    private Set<UUID> descendants(UUID root) {
        Set<UUID> ids = new HashSet<>();
        Deque<UUID> stack = new ArrayDeque<>();
        stack.push(root);
        while (!stack.isEmpty()) {
            UUID id = stack.pop();
            for (Node child : nodeRepository.findByParentIdAndDeletedAtIsNullOrderByTitleAsc(id)) {
                if (ids.add(child.getId())) {
                    stack.push(child.getId());
                }
            }
        }
        return ids;
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

    /** Global study stats: card maturity buckets + per-subject counts. */
    @Transactional(readOnly = true)
    public com.engram.web.dto.StatsResponse stats() {
        String today = LocalDate.now().toString();
        int total = 0;
        int unseen = 0;
        int learning = 0;
        int mature = 0;
        int due = 0;
        for (Node card : nodeRepository.findByTagName(CARD_TAG)) {
            total++;
            String d = prop(card.getId(), DUE);
            if (d == null || d.isBlank() || d.compareTo(today) <= 0) {
                due++;
            }
            double interval = number(card.getId(), INTERVAL, 0);
            if (interval <= 0) {
                unseen++;
            } else if (interval < 21) {
                learning++;
            } else {
                mature++;
            }
        }
        return new com.engram.web.dto.StatsResponse(total, unseen, learning, mature, due, summary());
    }

    /** A shuffled sample of cards for a mock exam (all cards in scope, not just due). */
    @Transactional(readOnly = true)
    public List<NodeResponse> exam(UUID scopeId, int count) {
        Set<UUID> scope = scopeId == null ? null : descendants(scopeId);
        List<Node> cards = new ArrayList<>(nodeRepository.findByTagName(CARD_TAG).stream()
                .filter(card -> scope == null || scope.contains(card.getId()))
                .toList());
        Collections.shuffle(cards);
        return cards.stream()
                .limit(Math.max(1, count))
                .map(card -> nodeService.get(card.getId()))
                .toList();
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
