package com.engram.service;

import com.engram.model.Attachment;
import com.engram.model.Node;
import com.engram.repository.AttachmentRepository;
import com.engram.repository.LinkRepository;
import com.engram.repository.NodePropertyRepository;
import com.engram.repository.NodeRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Full-vault export: a ZIP with all live pages (JSON), links, and attachment
 * files. A complete, portable, restorable snapshot of the knowledge base.
 */
@Service
public class BackupService {

    private final NodeRepository nodeRepository;
    private final LinkRepository linkRepository;
    private final AttachmentRepository attachmentRepository;
    private final NodePropertyRepository propertyRepository;
    private final ObjectMapper mapper;

    public BackupService(NodeRepository nodeRepository,
                         LinkRepository linkRepository,
                         AttachmentRepository attachmentRepository,
                         NodePropertyRepository propertyRepository,
                         ObjectMapper mapper) {
        this.nodeRepository = nodeRepository;
        this.linkRepository = linkRepository;
        this.attachmentRepository = attachmentRepository;
        this.propertyRepository = propertyRepository;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public byte[] export() {
        try {
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            try (ZipOutputStream zip = new ZipOutputStream(buffer)) {
                writeJson(zip, "pages.json", pages());
                writeJson(zip, "links.json", links());
                writeAttachments(zip);
            }
            return buffer.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to build backup", e);
        }
    }

    private List<Map<String, Object>> pages() {
        List<Map<String, Object>> pages = new ArrayList<>();
        for (Node node : nodeRepository.findAll()) {
            if (node.getDeletedAt() != null) {
                continue;
            }
            Map<String, Object> page = new LinkedHashMap<>();
            page.put("id", node.getId());
            page.put("title", node.getTitle());
            page.put("content", node.getContent());
            page.put("kind", node.getKind());
            page.put("layout", node.getLayout());
            page.put("parentId", node.getParent() != null ? node.getParent().getId() : null);
            page.put("favorite", node.isFavorite());
            page.put("template", node.isTemplate());
            page.put("tags", node.getTags().stream().map(t -> t.getName()).sorted().toList());
            page.put("properties", propertyRepository.findByNodeIdOrderByName(node.getId()).stream()
                    .map(p -> Map.of("name", p.getName(), "type", p.getType(), "value", p.getValue() == null ? "" : p.getValue()))
                    .toList());
            page.put("createdAt", node.getCreatedAt());
            page.put("updatedAt", node.getUpdatedAt());
            pages.add(page);
        }
        return pages;
    }

    private List<Map<String, Object>> links() {
        List<Map<String, Object>> links = new ArrayList<>();
        linkRepository.findAll().forEach(link -> {
            Map<String, Object> l = new LinkedHashMap<>();
            l.put("sourceId", link.getSource().getId());
            l.put("targetId", link.getTarget().getId());
            links.add(l);
        });
        return links;
    }

    private void writeAttachments(ZipOutputStream zip) throws Exception {
        for (Attachment attachment : attachmentRepository.findAll()) {
            Path path = Path.of(attachment.getStoragePath());
            if (!Files.exists(path)) {
                continue;
            }
            zip.putNextEntry(new ZipEntry("attachments/" + attachment.getId() + "__" + attachment.getFilename()));
            zip.write(Files.readAllBytes(path));
            zip.closeEntry();
        }
    }

    private void writeJson(ZipOutputStream zip, String name, Object data) throws Exception {
        zip.putNextEntry(new ZipEntry(name));
        zip.write(mapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(data));
        zip.closeEntry();
    }
}
