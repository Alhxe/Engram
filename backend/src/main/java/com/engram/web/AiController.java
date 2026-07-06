package com.engram.web;

import com.engram.ai.AiProviderType;
import com.engram.ai.AiException;
import com.engram.ai.AiTask;
import com.engram.security.SecurityUtils;
import com.engram.service.AiService;
import com.engram.service.AiSuggestionService;
import com.engram.service.AiFillService;
import com.engram.service.AskService;
import com.engram.service.EditService;
import com.engram.service.IngestionService;
import com.engram.service.AiUsageService;
import com.engram.service.NodeService;
import com.engram.service.SummaryService;
import com.engram.web.dto.AiSettingsResponse;
import com.engram.web.dto.AiSuggestionResponse;
import com.engram.web.dto.AskRequest;
import com.engram.web.dto.AskResponse;
import com.engram.web.dto.EditRequest;
import com.engram.web.dto.EditResponse;
import com.engram.web.dto.IngestionCommitRequest;
import com.engram.web.dto.IngestionPlan;
import com.engram.web.dto.IngestionResult;
import com.engram.web.dto.SetAiCredentialRequest;
import com.engram.web.dto.SetAiTaskModelRequest;
import jakarta.validation.Valid;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/ai")
public class AiController {

    private final AiService aiService;
    private final AiSuggestionService suggestionService;
    private final IngestionService ingestionService;
    private final AskService askService;
    private final AiFillService fillService;
    private final com.engram.service.LinkSuggestionService linkSuggestionService;
    private final com.engram.service.DuplicateService duplicateService;
    private final NodeService nodeService;
    private final AiUsageService usageService;
    private final SummaryService summaryService;
    private final EditService editService;

    public AiController(AiService aiService,
                        AiSuggestionService suggestionService,
                        IngestionService ingestionService,
                        AskService askService,
                        AiFillService fillService,
                        com.engram.service.LinkSuggestionService linkSuggestionService,
                        com.engram.service.DuplicateService duplicateService,
                        NodeService nodeService,
                        AiUsageService usageService,
                        SummaryService summaryService,
                        EditService editService) {
        this.aiService = aiService;
        this.suggestionService = suggestionService;
        this.ingestionService = ingestionService;
        this.askService = askService;
        this.fillService = fillService;
        this.linkSuggestionService = linkSuggestionService;
        this.duplicateService = duplicateService;
        this.nodeService = nodeService;
        this.usageService = usageService;
        this.summaryService = summaryService;
        this.editService = editService;
    }

    @GetMapping("/usage")
    public com.engram.web.dto.AiUsageResponse usage() {
        return usageService.usage(SecurityUtils.requireUserId());
    }

    @PostMapping("/suggest/{nodeId}")
    public AiSuggestionResponse suggest(@PathVariable UUID nodeId) {
        return suggestionService.suggest(SecurityUtils.requireUserId(), nodeId);
    }

    @PostMapping("/summarize/{parentId}")
    public com.engram.web.dto.SummaryResponse summarize(@PathVariable UUID parentId) {
        return summaryService.summarize(SecurityUtils.requireUserId(), parentId);
    }

    @PostMapping("/ask")
    public AskResponse ask(@Valid @RequestBody AskRequest request) {
        return askService.ask(SecurityUtils.requireUserId(), request.question(), request.scopeId());
    }

    @PostMapping("/fill")
    public com.engram.web.dto.FillResult fill(@Valid @RequestBody com.engram.web.dto.FillRequest request) {
        return fillService.fill(
                SecurityUtils.requireUserId(), request.parentId(),
                request.name(), request.type(), request.instruction());
    }

    @PostMapping("/edit/{nodeId}")
    public EditResponse edit(
            @PathVariable UUID nodeId, @Valid @RequestBody EditRequest request) {
        return editService.edit(SecurityUtils.requireUserId(), nodeId, request.instruction());
    }

    @PostMapping("/suggest-links/{nodeId}")
    public List<com.engram.web.dto.LinkSuggestion> suggestLinks(@PathVariable UUID nodeId) {
        return linkSuggestionService.suggest(SecurityUtils.requireUserId(), nodeId);
    }

    @PostMapping("/duplicates/{nodeId}")
    public List<com.engram.web.dto.DuplicateSuggestion> duplicates(@PathVariable UUID nodeId) {
        return duplicateService.find(SecurityUtils.requireUserId(), nodeId);
    }

    @PostMapping(value = "/ingest/preview", consumes = "multipart/form-data")
    public IngestionPlan ingestPreview(
            @RequestParam(required = false) MultipartFile file,
            @RequestParam(required = false) String text) {
        UUID userId = SecurityUtils.requireUserId();
        String content;
        if (file != null && !file.isEmpty()) {
            try {
                content = ingestionService.extractText(file.getOriginalFilename(), file.getBytes());
            } catch (IOException e) {
                throw new AiException("Could not read the uploaded file", e);
            }
        } else {
            content = text;
        }
        return ingestionService.preview(userId, content);
    }

    @PostMapping("/ingest/commit")
    public IngestionResult ingestCommit(@Valid @RequestBody IngestionCommitRequest request) {
        return ingestionService.commit(SecurityUtils.requireUserId(), request.parentId(), request.plan());
    }

    @PostMapping("/ingest/undo/{importId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void ingestUndo(@PathVariable UUID importId) {
        nodeService.undoImport(importId);
    }

    @GetMapping("/settings")
    public AiSettingsResponse settings() {
        return aiService.settings(SecurityUtils.requireUserId());
    }

    @PutMapping("/credential")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void setCredential(@Valid @RequestBody SetAiCredentialRequest request) {
        aiService.saveCredential(
                SecurityUtils.requireUserId(), request.provider(), request.apiKey(), request.baseUrl());
    }

    @DeleteMapping("/credential/{provider}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCredential(@PathVariable AiProviderType provider) {
        aiService.deleteCredential(SecurityUtils.requireUserId(), provider);
    }

    @PostMapping("/credential/{provider}/test")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void test(@PathVariable AiProviderType provider) {
        aiService.testConnection(SecurityUtils.requireUserId(), provider);
    }

    @PutMapping("/tasks/{task}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void setTaskModel(@PathVariable AiTask task, @Valid @RequestBody SetAiTaskModelRequest request) {
        aiService.setTaskModel(
                SecurityUtils.requireUserId(), task, request.provider(), request.model(), request.enabled());
    }
}
