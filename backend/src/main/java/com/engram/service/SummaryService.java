package com.engram.service;

import com.engram.ai.AiCompletionResult;
import com.engram.ai.AiTask;
import com.engram.model.Node;
import com.engram.repository.NodeRepository;
import com.engram.web.dto.SummaryResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Summarizes a page's sub-pages into one overview — batch AI over stored data. */
@Service
public class SummaryService {

    private static final int MAX_PAGES = 15;
    private static final int MAX_CHARS_PER_PAGE = 1200;

    private final NodeRepository nodeRepository;
    private final AiService aiService;

    public SummaryService(NodeRepository nodeRepository, AiService aiService) {
        this.nodeRepository = nodeRepository;
        this.aiService = aiService;
    }

    @Transactional(readOnly = true)
    public SummaryResponse summarize(UUID userId, UUID parentId) {
        Node page = nodeRepository.findById(parentId).orElse(null);
        List<Node> children = nodeRepository.findByParentIdAndDeletedAtIsNullOrderByTitleAsc(parentId);

        StringBuilder context = new StringBuilder();
        if (page != null) {
            String own = plainText(page.getContent());
            if (!own.isBlank()) {
                context.append("# ").append(page.getTitle()).append("\n").append(own).append("\n\n");
            }
        }
        children.stream().limit(MAX_PAGES).forEach(child -> {
            String text = plainText(child.getContent());
            if (!text.isBlank()) {
                context.append("## ").append(child.getTitle()).append("\n").append(text).append("\n\n");
            }
        });

        if (context.length() == 0) {
            return new SummaryResponse("");
        }

        String system = """
                You are given a page and/or its related sub-notes. Write a concise overview:
                the key points, common themes, and any open questions. Use short bullet points.
                Answer in the notes' language.
                """;
        String prompt = "Notes:\n" + context;

        AiCompletionResult result = aiService.run(userId, AiTask.SUMMARIZE, system, prompt, 900);
        return new SummaryResponse(result.text().trim());
    }

    private String plainText(String html) {
        if (html == null) {
            return "";
        }
        String text = html.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim();
        return text.length() > MAX_CHARS_PER_PAGE ? text.substring(0, MAX_CHARS_PER_PAGE) : text;
    }
}
