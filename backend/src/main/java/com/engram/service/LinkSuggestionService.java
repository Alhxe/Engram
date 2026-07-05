package com.engram.service;

import com.engram.ai.AiCompletionResult;
import com.engram.ai.AiException;
import com.engram.ai.AiJson;
import com.engram.ai.AiTask;
import com.engram.model.Link;
import com.engram.model.Node;
import com.engram.repository.LinkRepository;
import com.engram.repository.NodeRepository;
import com.engram.web.dto.LinkSuggestion;
import com.engram.web.dto.NodeResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Proposes relationships from a page to others: takes pages that mention this
 * one (candidates), asks the model which are genuinely related and with what
 * verb, and returns suggestions. Nothing is created — the user confirms.
 */
@Service
public class LinkSuggestionService {

    private static final int MAX_CANDIDATES = 15;
    private static final int SNIPPET_CHARS = 240;

    private final AiService aiService;
    private final NodeService nodeService;
    private final NodeRepository nodeRepository;
    private final LinkRepository linkRepository;
    private final ObjectMapper mapper;

    public LinkSuggestionService(AiService aiService,
                                 NodeService nodeService,
                                 NodeRepository nodeRepository,
                                 LinkRepository linkRepository,
                                 ObjectMapper mapper) {
        this.aiService = aiService;
        this.nodeService = nodeService;
        this.nodeRepository = nodeRepository;
        this.linkRepository = linkRepository;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<LinkSuggestion> suggest(UUID userId, UUID nodeId) {
        NodeResponse node = nodeService.get(nodeId);
        String title = node.title() == null ? "" : node.title().trim();
        if (title.length() < 3) {
            return List.of();
        }
        Set<UUID> alreadyLinked = linkRepository.findBySourceId(nodeId).stream()
                .map(link -> link.getTarget().getId())
                .collect(Collectors.toSet());
        List<Node> candidates = nodeRepository.findUnlinkedMentions(nodeId, title).stream()
                .filter(candidate -> !alreadyLinked.contains(candidate.getId()))
                .limit(MAX_CANDIDATES)
                .toList();
        if (candidates.isEmpty()) {
            return List.of();
        }

        StringBuilder list = new StringBuilder();
        for (int i = 0; i < candidates.size(); i++) {
            Node c = candidates.get(i);
            list.append("[").append(i + 1).append("] ").append(c.getTitle()).append(" — ")
                    .append(snippet(c.getContent())).append("\n");
        }

        String system = """
                You find MEANINGFUL relationships between a source page and candidate pages in a
                personal knowledge base. For each candidate that is genuinely related, output its number,
                a short relationship verb (relType) describing how the SOURCE relates to it — e.g.
                "related to", "depends on", "part of", "example of", "contradicts", "author of" — and a
                brief reason. Write relType and reason in the SAME LANGUAGE as the pages.
                Be selective: skip candidates that only share a word by coincidence.
                Respond with ONLY a JSON array: [{"n":1,"relType":"related to","reason":""}]
                """;
        String prompt = "Source page: " + title + "\n" + snippet(node.content())
                + "\n\nCandidates:\n" + list;

        AiCompletionResult result = aiService.run(userId, AiTask.LINKING, system, prompt, 700);
        return parse(result.text(), candidates);
    }

    private List<LinkSuggestion> parse(String raw, List<Node> candidates) {
        try {
            JsonNode root = mapper.readTree(AiJson.clean(raw));
            if (!root.isArray()) {
                return List.of();
            }
            List<LinkSuggestion> out = new ArrayList<>();
            for (JsonNode entry : root) {
                int n = entry.path("n").asInt(0);
                if (n < 1 || n > candidates.size()) {
                    continue;
                }
                Node candidate = candidates.get(n - 1);
                String relType = entry.path("relType").asText("related to").trim();
                out.add(new LinkSuggestion(candidate.getId(), candidate.getTitle(),
                        relType.isEmpty() ? "related to" : relType, entry.path("reason").asText("")));
            }
            return out;
        } catch (Exception e) {
            throw new AiException("Could not parse link suggestions", e);
        }
    }

    private String snippet(String html) {
        if (html == null) {
            return "";
        }
        String text = html.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim();
        return text.length() > SNIPPET_CHARS ? text.substring(0, SNIPPET_CHARS) + "…" : text;
    }
}
