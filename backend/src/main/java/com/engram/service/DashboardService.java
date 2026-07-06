package com.engram.service;

import com.engram.model.Node;
import com.engram.repository.NodePropertyRepository;
import com.engram.repository.NodeRepository;
import com.engram.web.dto.DashboardResponse;
import com.engram.web.dto.PageRef;
import com.engram.web.dto.SubjectReview;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Aggregates the Home dashboard in one call: study load (due cards per subject),
 * recently touched pages, open questions, and one page to resurface — so the
 * landing screen ties every subsystem together instead of a bare page list.
 */
@Service
public class DashboardService {

    private static final String QUESTION_TAG = "pregunta";
    private static final String STATE = "Estado";
    private static final String OPEN = "Abierta";

    private final NodeRepository nodeRepository;
    private final NodePropertyRepository propertyRepository;
    private final SrsService srsService;

    public DashboardService(NodeRepository nodeRepository,
                            NodePropertyRepository propertyRepository,
                            SrsService srsService) {
        this.nodeRepository = nodeRepository;
        this.propertyRepository = propertyRepository;
        this.srsService = srsService;
    }

    @Transactional(readOnly = true)
    public DashboardResponse load() {
        List<SubjectReview> subjects = srsService.summary();
        int dueCards = subjects.stream().mapToInt(SubjectReview::due).sum();

        List<PageRef> recent = nodeRepository
                .findByDeletedAtIsNull(PageRequest.of(0, 10, Sort.by(Sort.Order.desc("updatedAt"))))
                .getContent().stream()
                .filter(n -> n.getTitle() != null && !n.getTitle().isBlank())
                .limit(6)
                .map(this::ref)
                .toList();

        List<PageRef> openQuestions = nodeRepository.findByTagName(QUESTION_TAG).stream()
                .filter(this::isOpen)
                .limit(5)
                .map(this::ref)
                .toList();

        List<Node> random = nodeRepository.findRandom(1);
        PageRef resurface = random.isEmpty() ? null : ref(random.get(0));

        return new DashboardResponse(dueCards, subjects, recent, openQuestions, resurface);
    }

    private boolean isOpen(Node question) {
        return propertyRepository.findByNodeIdAndName(question.getId(), STATE)
                .map(p -> OPEN.equalsIgnoreCase(p.getValue()))
                .orElse(false);
    }

    private PageRef ref(Node node) {
        return new PageRef(node.getId(), node.getTitle(), node.getLayout());
    }
}
