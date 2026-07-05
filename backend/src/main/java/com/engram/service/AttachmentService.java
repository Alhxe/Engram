package com.engram.service;

import com.engram.model.Attachment;
import com.engram.model.Node;
import com.engram.repository.AttachmentRepository;
import com.engram.repository.NodeRepository;
import com.engram.web.dto.AttachmentResponse;
import com.engram.web.error.NotFoundException;
import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/**
 * Stores attachment bytes on the filesystem (one file per attachment id) and
 * keeps only metadata in the database.
 */
@Service
public class AttachmentService {

    private final AttachmentRepository attachmentRepository;
    private final NodeRepository nodeRepository;
    private final Path baseDir;

    public AttachmentService(AttachmentRepository attachmentRepository,
                             NodeRepository nodeRepository,
                             @Value("${engram.attachments.dir:./data/attachments}") String baseDir) {
        this.attachmentRepository = attachmentRepository;
        this.nodeRepository = nodeRepository;
        this.baseDir = Path.of(baseDir);
    }

    @PostConstruct
    void init() {
        try {
            Files.createDirectories(baseDir);
        } catch (IOException e) {
            throw new UncheckedIOException("Could not create attachments directory", e);
        }
    }

    @Transactional
    public AttachmentResponse store(UUID nodeId, MultipartFile file) {
        Node node = nodeRepository.findById(nodeId)
                .orElseThrow(() -> new NotFoundException("Node not found: " + nodeId));
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Uploaded file is empty");
        }

        UUID id = UUID.randomUUID();
        Path target = baseDir.resolve(id.toString());
        try {
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new UncheckedIOException("Could not store attachment", e);
        }

        Attachment attachment = new Attachment();
        attachment.setId(id);
        attachment.setNode(node);
        attachment.setFilename(sanitize(file.getOriginalFilename()));
        attachment.setContentType(file.getContentType());
        attachment.setSizeBytes(file.getSize());
        attachment.setStoragePath(target.toString());
        attachment = attachmentRepository.saveAndFlush(attachment);

        return toResponse(attachment);
    }

    @Transactional(readOnly = true)
    public List<AttachmentResponse> list(UUID nodeId) {
        return attachmentRepository.findByNodeIdOrderByCreatedAtAsc(nodeId).stream()
                .map(AttachmentService::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public Attachment require(UUID id) {
        return attachmentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Attachment not found: " + id));
    }

    @Transactional
    public void delete(UUID id) {
        Attachment attachment = require(id);
        try {
            Files.deleteIfExists(Path.of(attachment.getStoragePath()));
        } catch (IOException e) {
            throw new UncheckedIOException("Could not delete attachment file", e);
        }
        attachmentRepository.delete(attachment);
    }

    private static String sanitize(String filename) {
        if (filename == null || filename.isBlank()) {
            return "file";
        }
        return filename.replaceAll("[\\\\/]", "_");
    }

    private static AttachmentResponse toResponse(Attachment a) {
        return new AttachmentResponse(
                a.getId(), a.getNode().getId(), a.getFilename(),
                a.getContentType(), a.getSizeBytes(), a.getCreatedAt());
    }
}
