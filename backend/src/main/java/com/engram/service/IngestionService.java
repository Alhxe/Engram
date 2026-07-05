package com.engram.service;

import com.engram.ai.AiCompletionResult;
import com.engram.ai.AiException;
import com.engram.ai.AiJson;
import com.engram.ai.AiTask;
import com.engram.model.Node;
import com.engram.model.PageLayout;
import com.engram.model.PropertyType;
import com.engram.repository.NodeRepository;
import com.engram.repository.TagRepository;
import com.engram.web.dto.CreateLinkRequest;
import com.engram.web.dto.CreateNodeRequest;
import com.engram.web.dto.IngestionPlan;
import com.engram.web.dto.IngestionResult;
import com.engram.web.dto.NodeResponse;
import com.engram.web.dto.PlannedPage;
import com.engram.web.dto.PlannedProperty;
import com.engram.web.dto.PropertyDto;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Turns a document (PDF or text) into a set of formatted, tagged, interlinked
 * pages. Two steps: {@link #preview} (AI, no writes) and {@link #commit}
 * (materialize the reviewed plan, no AI) so the user confirms and cost is paid once.
 */
@Service
public class IngestionService {

    private static final int MAX_INPUT_CHARS = 30_000;
    private static final int MAX_OUTPUT_TOKENS = 6_000;

    private final AiService aiService;
    private final NodeService nodeService;
    private final LinkService linkService;
    private final NodeRepository nodeRepository;
    private final TagRepository tagRepository;
    private final ObjectMapper mapper;

    public IngestionService(AiService aiService,
                            NodeService nodeService,
                            LinkService linkService,
                            NodeRepository nodeRepository,
                            TagRepository tagRepository,
                            ObjectMapper mapper) {
        this.aiService = aiService;
        this.nodeService = nodeService;
        this.linkService = linkService;
        this.nodeRepository = nodeRepository;
        this.tagRepository = tagRepository;
        this.mapper = mapper;
    }

    public String extractText(String filename, byte[] bytes) {
        boolean isPdf = filename != null && filename.toLowerCase().endsWith(".pdf");
        if (!isPdf) {
            return new String(bytes, java.nio.charset.StandardCharsets.UTF_8);
        }
        try (PDDocument document = Loader.loadPDF(bytes)) {
            return new PDFTextStripper().getText(document);
        } catch (IOException e) {
            throw new AiException("Could not read PDF: " + e.getMessage(), e);
        }
    }

    public IngestionPlan preview(UUID userId, String text) {
        String content = text == null ? "" : text.strip();
        if (content.isBlank()) {
            throw new AiException("The document is empty");
        }
        if (content.length() > MAX_INPUT_CHARS) {
            content = content.substring(0, MAX_INPUT_CHARS);
        }

        List<String> existingTags = tagRepository.findAll().stream().map(t -> t.getName()).sorted().toList();
        List<String> existingTitles = nodeRepository.findAllTitles();
        if (existingTitles.size() > 200) {
            existingTitles = existingTitles.subList(0, 200);
        }

        String system = """
                You convert a document into structured pages for a personal knowledge app.
                Split it into one or more pages that each capture a coherent topic or section.
                For each page:
                - Choose a layout from: DOCUMENT (prose/notes), TABLE (rows of data), BOARD (grouped items),
                  CALENDAR (dated items), MINDMAP (a set of related concepts). Most pages are DOCUMENT.
                - Write "html": clean semantic HTML using <h1><h2><h3><p><ul><ol><li><strong><em><u>
                  <blockquote><pre><code><hr> and <table><thead><tbody><tr><th><td>. You may also use
                  callout boxes for tips/warnings: <div class="callout" data-variant="info"><p>...</p></div>
                  (variant is one of info, success, warn, danger, note). No inline styles, scripts, or images.
                - Suggest a few "tags", reusing an existing tag when it fits.
                - Optionally add "properties". Property type is one of TEXT, NUMBER, DATE (YYYY-MM-DD),
                  SELECT, CHECKBOX ("true"/"false"), URL, EMAIL, MULTISELECT (comma-separated), RATING (1-5).
                  Choose the specific type when it fits (URL for links, EMAIL for emails, DATE for dates).
                - In "linkTitles", list the titles of other pages (in this plan or existing) this page relates to.
                Respond with ONLY this JSON, no prose:
                {"pages":[{"title":"","layout":"DOCUMENT","html":"","tags":[""],"properties":[{"name":"","type":"TEXT","value":null}],"linkTitles":[""]}]}
                """;

        String prompt = "Existing tags: " + existingTags + "\n"
                + "Existing page titles: " + existingTitles + "\n\n"
                + "Document:\n" + content;

        AiCompletionResult result = aiService.run(userId, AiTask.INGESTION, system, prompt, MAX_OUTPUT_TOKENS);
        return parse(result.text());
    }

    @Transactional
    public IngestionResult commit(UUID userId, UUID parentId, IngestionPlan plan) {
        if (plan == null || plan.pages() == null || plan.pages().isEmpty()) {
            throw new AiException("Nothing to import");
        }

        UUID importId = UUID.randomUUID();
        Map<String, UUID> createdByTitle = new HashMap<>();
        List<UUID> createdIds = new ArrayList<>();

        for (PlannedPage page : plan.pages()) {
            String title = page.title() == null || page.title().isBlank() ? "Untitled" : page.title().trim();
            PageLayout layout = page.layout() != null ? page.layout() : PageLayout.DOCUMENT;
            NodeResponse created = nodeService.create(new CreateNodeRequest(
                    title, page.html() == null ? "" : page.html(), null, layout, parentId, page.tags()));
            createdByTitle.put(title.toLowerCase(), created.id());
            createdIds.add(created.id());

            if (page.properties() != null) {
                for (PlannedProperty property : page.properties()) {
                    if (property.name() == null || property.name().isBlank()) {
                        continue;
                    }
                    PropertyType type = property.type() != null ? property.type() : PropertyType.TEXT;
                    nodeService.upsertProperty(created.id(),
                            new PropertyDto(property.name().trim(), type, property.value()));
                }
            }
        }

        int links = 0;
        for (PlannedPage page : plan.pages()) {
            UUID sourceId = createdByTitle.get(
                    (page.title() == null ? "untitled" : page.title().trim().toLowerCase()));
            if (sourceId == null || page.linkTitles() == null) {
                continue;
            }
            for (String linkTitle : page.linkTitles()) {
                UUID targetId = resolveTitle(linkTitle, createdByTitle);
                if (targetId != null && !targetId.equals(sourceId)) {
                    try {
                        linkService.create(new CreateLinkRequest(sourceId, targetId, null));
                        links++;
                    } catch (RuntimeException ignored) {
                        // Best-effort linking; skip anything that can't be linked.
                    }
                }
            }
        }

        nodeRepository.assignImportId(createdIds, importId);
        return new IngestionResult(createdIds.size(), links, createdIds, importId);
    }

    private UUID resolveTitle(String title, Map<String, UUID> createdByTitle) {
        if (title == null || title.isBlank()) {
            return null;
        }
        UUID created = createdByTitle.get(title.trim().toLowerCase());
        if (created != null) {
            return created;
        }
        List<Node> existing = nodeRepository.findByTitleIgnoreCaseAndDeletedAtIsNull(title.trim());
        return existing.isEmpty() ? null : existing.get(0).getId();
    }

    private IngestionPlan parse(String raw) {
        try {
            JsonNode root = mapper.readTree(AiJson.clean(raw));
            List<PlannedPage> pages = new ArrayList<>();
            for (JsonNode p : root.path("pages")) {
                String title = p.path("title").asText("").trim();
                if (title.isEmpty()) {
                    continue;
                }
                pages.add(new PlannedPage(
                        title,
                        p.path("html").asText(""),
                        parseLayout(p.path("layout").asText("DOCUMENT")),
                        stringList(p.path("tags")),
                        properties(p.path("properties")),
                        stringList(p.path("linkTitles"))));
            }
            if (pages.isEmpty()) {
                throw new AiException("The AI did not propose any pages");
            }
            return new IngestionPlan(pages);
        } catch (AiException e) {
            throw e;
        } catch (Exception e) {
            throw new AiException("Could not parse the ingestion plan", e);
        }
    }

    private List<PlannedProperty> properties(JsonNode node) {
        List<PlannedProperty> properties = new ArrayList<>();
        for (JsonNode p : node) {
            String name = p.path("name").asText("").trim();
            if (name.isEmpty()) {
                continue;
            }
            PropertyType type;
            try {
                type = PropertyType.valueOf(p.path("type").asText("TEXT").trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                type = PropertyType.TEXT;
            }
            String value = p.path("value").isNull() ? null : p.path("value").asText(null);
            properties.add(new PlannedProperty(name, type, value));
        }
        return properties;
    }

    private List<String> stringList(JsonNode node) {
        List<String> values = new ArrayList<>();
        for (JsonNode item : node) {
            String value = item.asText("").trim();
            if (!value.isEmpty()) {
                values.add(value);
            }
        }
        return values;
    }

    private PageLayout parseLayout(String raw) {
        try {
            return PageLayout.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return PageLayout.DOCUMENT;
        }
    }
}
