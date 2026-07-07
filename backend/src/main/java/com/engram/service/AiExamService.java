package com.engram.service;

import com.engram.ai.AiCompletionResult;
import com.engram.ai.AiException;
import com.engram.ai.AiJson;
import com.engram.ai.AiTask;
import com.engram.web.dto.ExamQuestion;
import com.engram.web.dto.GuideSection;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Generates a real multiple-choice exam from a page's whole subtree with AI:
 * challenging, application-level questions (scenarios, trade-offs, subtle
 * distinctions), each with four options, one correct answer and an explanation.
 * The exam is ephemeral — it isn't stored, it's taken and graded on the spot.
 */
@Service
public class AiExamService {

    private static final int MAX_QUESTIONS = 20;
    private static final int MAX_CHARS = 8000;

    private final AiService aiService;
    private final NodeService nodeService;
    private final ObjectMapper mapper;

    public AiExamService(AiService aiService, NodeService nodeService, ObjectMapper mapper) {
        this.aiService = aiService;
        this.nodeService = nodeService;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<ExamQuestion> generate(UUID userId, UUID pageId, int count) {
        StringBuilder material = new StringBuilder();
        for (GuideSection section : nodeService.guide(pageId)) {
            material.append("## ").append(nullToEmpty(section.title())).append("\n")
                    .append(toPlainText(section.content())).append("\n\n");
        }
        String text = trim(material.toString());
        if (text.isBlank()) {
            throw new AiException("This page has no content to build an exam from");
        }

        int n = Math.max(1, Math.min(count, MAX_QUESTIONS));
        String system = """
                You are an exam writer. From the material, create %d CHALLENGING multiple-choice
                questions that test UNDERSTANDING and APPLICATION — scenarios, trade-offs,
                "which fits best when…", subtle distinctions — NOT trivia recall.
                Rules:
                - Each question has EXACTLY 4 options; exactly ONE is correct.
                - Distractors must be plausible (common misconceptions), never obviously wrong.
                - "answer" is the 0-based index of the correct option.
                - Add a one-sentence "explanation" of why that option is correct.
                - Base everything ONLY on the material. Answer in the material's language.
                Respond with ONLY a JSON array:
                [{"question":"...","options":["a","b","c","d"],"answer":2,"explanation":"..."}]
                """.formatted(n);

        int maxTokens = Math.min(4000, 200 * n + 400);
        AiCompletionResult result = aiService.run(userId, AiTask.INGESTION, system, text, maxTokens);
        return parse(result.text());
    }

    private List<ExamQuestion> parse(String raw) {
        try {
            JsonNode root = mapper.readTree(AiJson.clean(raw));
            if (!root.isArray()) {
                throw new AiException("AI did not return a question list");
            }
            List<ExamQuestion> out = new ArrayList<>();
            for (JsonNode q : root) {
                String question = q.path("question").asText("").trim();
                List<String> options = new ArrayList<>();
                for (JsonNode option : q.path("options")) {
                    options.add(option.asText("").trim());
                }
                int answer = q.path("answer").asInt(-1);
                String explanation = q.path("explanation").asText("").trim();
                if (question.isEmpty() || options.size() < 2 || answer < 0 || answer >= options.size()) {
                    continue;
                }
                out.add(new ExamQuestion(question, options, answer, explanation));
            }
            if (out.isEmpty()) {
                throw new AiException("The AI produced no usable questions — try a page with more content");
            }
            return out;
        } catch (AiException e) {
            throw e;
        } catch (Exception e) {
            throw new AiException("Could not parse the exam", e);
        }
    }

    private String trim(String text) {
        return text.length() > MAX_CHARS ? text.substring(0, MAX_CHARS) : text;
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
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
