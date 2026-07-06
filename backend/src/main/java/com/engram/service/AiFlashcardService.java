package com.engram.service;

import com.engram.ai.AiCompletionResult;
import com.engram.ai.AiException;
import com.engram.ai.AiJson;
import com.engram.ai.AiTask;
import com.engram.model.Node;
import com.engram.repository.NodeRepository;
import com.engram.web.dto.CreateNodeRequest;
import com.engram.web.dto.NodeResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Generates study flashcards from a page with AI. The material is the page's own
 * content plus its sub-pages (so it works on a single topic or a whole syllabus
 * page), and each card is created as a child page tagged {@code flashcard} —
 * ready for spaced-repetition review. Title = question, content = answer.
 */
@Service
public class AiFlashcardService {

    private static final int MAX_CARDS = 15;
    private static final int MAX_CHILDREN = 30;
    private static final int MAX_CHARS = 6000;

    private final AiService aiService;
    private final NodeService nodeService;
    private final NodeRepository nodeRepository;
    private final ObjectMapper mapper;

    public AiFlashcardService(AiService aiService,
                              NodeService nodeService,
                              NodeRepository nodeRepository,
                              ObjectMapper mapper) {
        this.aiService = aiService;
        this.nodeService = nodeService;
        this.nodeRepository = nodeRepository;
        this.mapper = mapper;
    }

    @Transactional
    public List<NodeResponse> generate(UUID userId, UUID pageId, int count) {
        Node page = nodeRepository.findById(pageId)
                .filter(n -> n.getDeletedAt() == null)
                .orElseThrow(() -> new AiException("Page not found"));

        StringBuilder material = new StringBuilder();
        material.append("# ").append(nullToEmpty(page.getTitle())).append("\n")
                .append(toPlainText(page.getContent())).append("\n\n");
        List<Node> children = nodeRepository
                .findByParentIdAndDeletedAtIsNull(pageId,
                        PageRequest.of(0, MAX_CHILDREN, Sort.by(Sort.Order.asc("position"), Sort.Order.asc("createdAt"))))
                .getContent();
        for (Node child : children) {
            material.append("## ").append(nullToEmpty(child.getTitle())).append("\n")
                    .append(toPlainText(child.getContent())).append("\n\n");
        }

        int n = Math.max(1, Math.min(count, MAX_CARDS));
        String system = """
                You create study flashcards from a topic in a personal knowledge app.
                Produce %d question/answer cards that test understanding of the KEY ideas.
                Rules:
                - Questions are short and specific; answers concise (1-3 sentences) and self-contained.
                - Base cards ONLY on the given material. Never invent facts beyond it.
                - Answer in the material's language.
                Respond with ONLY a JSON array: [{"q":"...","a":"..."}]
                """.formatted(n);

        int maxTokens = Math.min(2500, 120 * n + 300);
        AiCompletionResult result = aiService.run(userId, AiTask.INGESTION, system, trim(material.toString()), maxTokens);
        return createCards(pageId, result.text());
    }

    private List<NodeResponse> createCards(UUID parentId, String raw) {
        try {
            JsonNode root = mapper.readTree(AiJson.clean(raw));
            if (!root.isArray()) {
                throw new AiException("AI did not return a list of cards");
            }
            List<NodeResponse> created = new ArrayList<>();
            for (JsonNode card : root) {
                String q = card.path("q").asText("").trim();
                String a = card.path("a").asText("").trim();
                if (q.isEmpty() || a.isEmpty()) {
                    continue;
                }
                created.add(nodeService.create(new CreateNodeRequest(
                        q, "<p>" + escape(a) + "</p>", null, null, parentId, List.of("flashcard"))));
            }
            if (created.isEmpty()) {
                throw new AiException("The AI produced no usable cards — try a page with more content");
            }
            return created;
        } catch (AiException e) {
            throw e;
        } catch (Exception e) {
            throw new AiException("Could not parse AI cards", e);
        }
    }

    private String trim(String text) {
        return text.length() > MAX_CHARS ? text.substring(0, MAX_CHARS) : text;
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }

    private static String escape(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    private String toPlainText(String html) {
        if (html == null) {
            return "";
        }
        return html
                .replaceAll("(?is)<(script|style)[^>]*>.*?</\\1>", " ")
                .replaceAll("<[^>]+>", " ")
                .replace("&nbsp;", " ")
                .replace("&amp;", "&")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replaceAll("\\s+", " ")
                .trim();
    }
}
