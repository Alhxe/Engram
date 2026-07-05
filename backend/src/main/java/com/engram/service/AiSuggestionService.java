package com.engram.service;

import com.engram.ai.AiCompletionResult;
import com.engram.ai.AiException;
import com.engram.ai.AiJson;
import com.engram.ai.AiTask;
import com.engram.model.PropertyType;
import com.engram.model.Tag;
import com.engram.repository.NodePropertyRepository;
import com.engram.repository.TagRepository;
import com.engram.web.dto.AiSuggestionResponse;
import com.engram.web.dto.NodeResponse;
import com.engram.web.dto.PropertySuggestion;
import com.engram.web.dto.TagSuggestion;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

/**
 * Suggests tags and properties for a page using the cheap per-task model.
 * Existing tags are provided so the model reuses them instead of inventing
 * duplicates. Nothing is applied — the user confirms suggestions in the UI.
 */
@Service
public class AiSuggestionService {

    private static final int MAX_CONTENT_CHARS = 6000;

    /** Generic words that make useless tags; dropped even if the model suggests them. */
    private static final Set<String> TAG_NOISE = Set.of(
            "text", "texto", "number", "numero", "número", "date", "fecha", "select", "seleccion",
            "checkbox", "casilla", "tag", "tags", "etiqueta", "etiquetas", "note", "nota", "notas",
            "page", "pagina", "página", "document", "documento", "untitled", "sin título", "sin titulo");

    private final AiService aiService;
    private final NodeService nodeService;
    private final TagRepository tagRepository;
    private final NodePropertyRepository propertyRepository;
    private final ObjectMapper mapper;

    public AiSuggestionService(AiService aiService,
                               NodeService nodeService,
                               TagRepository tagRepository,
                               NodePropertyRepository propertyRepository,
                               ObjectMapper mapper) {
        this.aiService = aiService;
        this.nodeService = nodeService;
        this.tagRepository = tagRepository;
        this.propertyRepository = propertyRepository;
        this.mapper = mapper;
    }

    public AiSuggestionResponse suggest(UUID userId, UUID nodeId) {
        NodeResponse node = nodeService.get(nodeId);
        String text = toPlainText((node.title() == null ? "" : node.title()) + "\n"
                + (node.content() == null ? "" : node.content()));
        if (text.isBlank()) {
            return new AiSuggestionResponse(List.of(), List.of());
        }

        List<String> existingTags = tagRepository.findAll().stream()
                .map(Tag::getName).sorted().toList();
        List<String> existingProps = propertyRepository.findDistinctNames();

        String system = """
                You suggest tags and typed properties for a note in a personal knowledge app.
                Rules:
                - Tags must be specific, meaningful topics (a subject, project, place, person or theme),
                  1-3 words, in the note's language. NEVER suggest generic words like "note", "text",
                  "page", or the names of property types.
                - Prefer reusing an existing tag when it fits; only invent a new one if none match.
                - Aim for 2-4 tags capturing DIFFERENT facets (e.g. broad topic + specific subtopic + type),
                  not several near-synonyms of the title. Suggest 0-3 properties.
                - Be conservative on properties: only what clearly helps.
                - Property type is one of: TEXT, NUMBER, DATE, SELECT, CHECKBOX, URL, EMAIL, MULTISELECT,
                  RATING. DATE values use YYYY-MM-DD, CHECKBOX "true"/"false", MULTISELECT comma-separated,
                  RATING 1-5. Prefer a specific type (URL, EMAIL, DATE, RATING) over TEXT when it fits.
                - If the note is too thin to tag meaningfully, return empty arrays.
                - Keep reasons to a short phrase.
                Respond with ONLY this JSON, no prose:
                {"tags":[{"name":"","reason":""}],"properties":[{"name":"","type":"TEXT","value":null,"reason":""}]}
                """;

        String prompt = "Existing tags: " + existingTags + "\n"
                + "Existing property names: " + existingProps + "\n\n"
                + "Note:\n" + text;

        AiCompletionResult result = aiService.run(userId, AiTask.TAG_SUGGESTION, system, prompt, 700);
        return parse(result.text(), existingTags);
    }

    private AiSuggestionResponse parse(String raw, List<String> existingTags) {
        Set<String> existingLower = existingTags.stream()
                .map(t -> t.toLowerCase()).collect(Collectors.toSet());
        try {
            JsonNode root = mapper.readTree(AiJson.clean(raw));

            List<TagSuggestion> tags = new ArrayList<>();
            for (JsonNode t : root.path("tags")) {
                String name = t.path("name").asText("").trim();
                if (name.length() < 2 || TAG_NOISE.contains(name.toLowerCase())) {
                    continue;
                }
                tags.add(new TagSuggestion(name, existingLower.contains(name.toLowerCase()),
                        t.path("reason").asText("")));
            }

            List<PropertySuggestion> properties = new ArrayList<>();
            for (JsonNode p : root.path("properties")) {
                String name = p.path("name").asText("").trim();
                if (name.isEmpty()) {
                    continue;
                }
                PropertyType type = parseType(p.path("type").asText("TEXT"));
                String value = p.path("value").isNull() ? null : p.path("value").asText(null);
                properties.add(new PropertySuggestion(name, type, value, p.path("reason").asText("")));
            }

            return new AiSuggestionResponse(tags, properties);
        } catch (AiException e) {
            throw e;
        } catch (Exception e) {
            throw new AiException("Could not parse AI suggestions", e);
        }
    }

    private PropertyType parseType(String raw) {
        try {
            return PropertyType.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return PropertyType.TEXT;
        }
    }

    private String toPlainText(String html) {
        String text = html
                .replaceAll("(?is)<(script|style)[^>]*>.*?</\\1>", " ")
                .replaceAll("<[^>]+>", " ")
                .replace("&nbsp;", " ")
                .replace("&amp;", "&")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replaceAll("\\s+", " ")
                .trim();
        return text.length() > MAX_CONTENT_CHARS ? text.substring(0, MAX_CONTENT_CHARS) : text;
    }
}
