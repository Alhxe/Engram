package com.engram.service;

import com.engram.ai.AiCompletionResult;
import com.engram.ai.AiException;
import com.engram.ai.AiJson;
import com.engram.ai.AiTask;
import com.engram.model.Node;
import com.engram.repository.NodeRepository;
import com.engram.web.dto.EditResponse;
import com.engram.web.error.NotFoundException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Rewrites an existing page's content from a natural-language instruction
 * ("add a section on X", "summarise", "translate to English"). Returns the new
 * HTML for the user to preview; nothing is saved here — the client applies it
 * through the normal save path, and creates the inline links it reports.
 */
@Service
public class EditService {

    private static final int MAX_OUTPUT_TOKENS = 6_000;
    private static final int MAX_CONTENT_CHARS = 24_000;

    private final AiService aiService;
    private final PageLinkResolver pageLinkResolver;
    private final NodeRepository nodeRepository;
    private final ObjectMapper mapper;

    public EditService(AiService aiService,
                       PageLinkResolver pageLinkResolver,
                       NodeRepository nodeRepository,
                       ObjectMapper mapper) {
        this.aiService = aiService;
        this.pageLinkResolver = pageLinkResolver;
        this.nodeRepository = nodeRepository;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public EditResponse edit(UUID userId, UUID nodeId, String instruction) {
        if (instruction == null || instruction.isBlank()) {
            throw new AiException("Tell the AI what to change");
        }
        Node node = nodeRepository.findById(nodeId)
                .orElseThrow(() -> new NotFoundException("Node not found: " + nodeId));

        String current = node.getContent() == null ? "" : node.getContent();
        if (current.length() > MAX_CONTENT_CHARS) {
            current = current.substring(0, MAX_CONTENT_CHARS);
        }

        List<String> existingTitles = new ArrayList<>(nodeRepository.findAllTitles());
        existingTitles.removeIf(t -> t != null && t.equalsIgnoreCase(node.getTitle()));
        if (existingTitles.size() > 200) {
            existingTitles = existingTitles.subList(0, 200);
        }

        String system = """
                You edit one page of a personal knowledge app, following the user's instruction.
                Return the FULL new body as clean semantic HTML using <h1><h2><h3><p><ul><ol><li>
                <strong><em><u><blockquote><pre><code><hr> and <table><thead><tbody><tr><th><td>.
                You may use callouts: <div class="callout" data-variant="info"><p>...</p></div>
                (variant one of info, success, warn, danger, note). No inline styles, scripts, or images.
                Preserve the parts of the page the instruction does not touch. Keep the page's language
                unless asked to translate.
                Whenever the prose mentions another page — one of the existing page titles listed below —
                wrap that mention in <a data-mention="Exact Page Title">the words as they appear</a>, using
                the page's exact title. Only link genuine references to real pages; never invent titles.
                Respond with ONLY this JSON, no prose: {"html":""}
                """;
        String prompt = "Page title: " + node.getTitle() + "\n"
                + "Existing page titles: " + existingTitles + "\n\n"
                + "Current html:\n" + current + "\n\n"
                + "Instruction: " + instruction.strip();

        AiCompletionResult result = aiService.run(userId, AiTask.INGESTION, system, prompt, MAX_OUTPUT_TOKENS);
        String html = parseHtml(result.text());

        PageLinkResolver.Resolved resolved = pageLinkResolver.resolve(html, Map.of());
        List<UUID> linkedIds = resolved.targetIds().stream()
                .filter(id -> !id.equals(nodeId))
                .toList();
        return new EditResponse(resolved.html(), linkedIds);
    }

    private String parseHtml(String raw) {
        try {
            JsonNode root = mapper.readTree(AiJson.clean(raw));
            String html = root.path("html").asText("");
            if (html.isBlank()) {
                throw new AiException("The AI returned no content");
            }
            return html;
        } catch (AiException e) {
            throw e;
        } catch (Exception e) {
            throw new AiException("Could not parse the AI's response", e);
        }
    }
}
