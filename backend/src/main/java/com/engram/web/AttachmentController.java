package com.engram.web;

import com.engram.model.Attachment;
import com.engram.service.AttachmentService;
import com.engram.web.dto.AttachmentResponse;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class AttachmentController {

    private final AttachmentService attachmentService;

    public AttachmentController(AttachmentService attachmentService) {
        this.attachmentService = attachmentService;
    }

    @PostMapping("/api/v1/nodes/{nodeId}/attachments")
    @ResponseStatus(HttpStatus.CREATED)
    public AttachmentResponse upload(@PathVariable UUID nodeId, @RequestParam("file") MultipartFile file) {
        return attachmentService.store(nodeId, file);
    }

    @GetMapping("/api/v1/nodes/{nodeId}/attachments")
    public List<AttachmentResponse> list(@PathVariable UUID nodeId) {
        return attachmentService.list(nodeId);
    }

    @GetMapping("/api/v1/attachments/{id}")
    public ResponseEntity<Resource> download(@PathVariable UUID id) {
        Attachment attachment = attachmentService.require(id);
        Resource resource = new FileSystemResource(Path.of(attachment.getStoragePath()));
        MediaType mediaType = attachment.getContentType() != null
                ? MediaType.parseMediaType(attachment.getContentType())
                : MediaType.APPLICATION_OCTET_STREAM;
        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"" + attachment.getFilename() + "\"")
                .body(resource);
    }

    @DeleteMapping("/api/v1/attachments/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        attachmentService.delete(id);
    }
}
