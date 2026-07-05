package com.engram.service;

import com.engram.ai.AiCompletionResult;
import com.engram.ai.AiException;
import com.engram.ai.AiJson;
import com.engram.ai.AiTask;
import com.engram.model.Node;
import com.engram.model.PropertyType;
import com.engram.repository.NodeRepository;
import com.engram.web.dto.FillResult;
import com.engram.web.dto.PropertyDto;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Bulk-fills a single property across all sub-pages of a page. The model reads
 * each child's content once (one batched call, not one per page) and returns a
 * value per item, which is written to the property. Works on any collection —
 * extract an email, classify, one-line summary, etc.
 */
@Service
public class AiFillService {

    private static final int MAX_ITEMS = 40;
    private static final int MAX_CONTENT_CHARS = 1200;

    private final AiService aiService;
    private final NodeService nodeService;
    private final NodeRepository nodeRepository;
    private final ObjectMapper mapper;

    public AiFillService(AiService aiService,
                         NodeService nodeService,
                         NodeRepository nodeRepository,
                         ObjectMapper mapper) {
        this.aiService = aiService;
        this.nodeService = nodeService;
        this.nodeRepository = nodeRepository;
        this.mapper = mapper;
    }

    @Transactional
    public FillResult fill(UUID userId, UUID parentId, String name, PropertyType type, String instruction) {
        PropertyType propertyType = type != null ? type : PropertyType.TEXT;
        List<Node> children = nodeRepository
                .findByParentIdAndDeletedAtIsNull(parentId,
                        PageRequest.of(0, MAX_ITEMS, Sort.by(Sort.Order.asc("position"), Sort.Order.asc("createdAt"))))
                .getContent();
        if (children.isEmpty()) {
            return new FillResult(0, 0);
        }

        StringBuilder items = new StringBuilder();
        for (int i = 0; i < children.size(); i++) {
            Node child = children.get(i);
            items.append("[").append(i + 1).append("] Title: ")
                    .append(child.getTitle() == null ? "" : child.getTitle()).append("\n")
                    .append("Content: ").append(trim(toPlainText(child.getContent()))).append("\n\n");
        }

        String system = """
                You fill ONE property for each item in a personal knowledge app, from its content.
                The property is named "%s" and its type is %s.
                For each item produce its value by following this instruction: %s
                Rules:
                - Return ONLY the value, concise. DATE -> YYYY-MM-DD. CHECKBOX -> true/false.
                  NUMBER -> a bare number. SELECT/TEXT -> a short label or phrase.
                - If an item gives no basis for a value, use null. Never invent facts.
                - Answer in the items' language.
                Respond with ONLY a JSON array, one entry per item number:
                [{"n":1,"value":"..."},{"n":2,"value":null}]
                """.formatted(name, propertyType, instruction);

        int maxTokens = Math.min(1500, 40 * children.size() + 200);
        AiCompletionResult result = aiService.run(userId, AiTask.PROPERTY_SUGGESTION, system, items.toString(), maxTokens);

        int filled = apply(result.text(), children, name, propertyType);
        return new FillResult(filled, children.size());
    }

    private int apply(String raw, List<Node> children, String name, PropertyType type) {
        try {
            JsonNode root = mapper.readTree(AiJson.clean(raw));
            if (!root.isArray()) {
                throw new AiException("AI did not return a list of values");
            }
            int filled = 0;
            for (JsonNode entry : root) {
                int n = entry.path("n").asInt(0);
                if (n < 1 || n > children.size()) {
                    continue;
                }
                JsonNode valueNode = entry.path("value");
                if (valueNode.isNull() || valueNode.isMissingNode()) {
                    continue;
                }
                String value = valueNode.asText("").trim();
                if (value.isEmpty() || value.equalsIgnoreCase("null")) {
                    continue;
                }
                nodeService.upsertProperty(children.get(n - 1).getId(), new PropertyDto(name, type, value));
                filled++;
            }
            return filled;
        } catch (AiException e) {
            throw e;
        } catch (Exception e) {
            throw new AiException("Could not parse AI values", e);
        }
    }

    private String trim(String text) {
        return text.length() > MAX_CONTENT_CHARS ? text.substring(0, MAX_CONTENT_CHARS) : text;
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
