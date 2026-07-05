package com.engram.service;

import com.engram.model.Link;
import com.engram.model.Node;
import com.engram.repository.LinkRepository;
import com.engram.repository.NodeRepository;
import com.engram.web.dto.CreateLinkRequest;
import com.engram.web.dto.LinkResponse;
import com.engram.web.error.NotFoundException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LinkService {

    private final LinkRepository linkRepository;
    private final NodeRepository nodeRepository;

    public LinkService(LinkRepository linkRepository, NodeRepository nodeRepository) {
        this.linkRepository = linkRepository;
        this.nodeRepository = nodeRepository;
    }

    @Transactional
    public LinkResponse create(CreateLinkRequest request) {
        if (request.sourceId().equals(request.targetId())) {
            throw new IllegalArgumentException("A node cannot link to itself");
        }
        Node source = requireNode(request.sourceId());
        Node target = requireNode(request.targetId());

        String relType = normalizeType(request.relType());
        Link link = linkRepository.findBySourceId(source.getId()).stream()
                .filter(existing -> existing.getTarget().getId().equals(target.getId()))
                .findFirst()
                .orElseGet(() -> {
                    Link created = new Link();
                    created.setSource(source);
                    created.setTarget(target);
                    return created;
                });
        if (relType != null) {
            link.setRelType(relType);
        }
        return toResponse(linkRepository.saveAndFlush(link));
    }

    @Transactional
    public LinkResponse setType(UUID id, String relType) {
        Link link = linkRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Link not found: " + id));
        link.setRelType(normalizeType(relType));
        return toResponse(linkRepository.saveAndFlush(link));
    }

    private static String normalizeType(String raw) {
        if (raw == null) {
            return null;
        }
        String trimmed = raw.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    @Transactional(readOnly = true)
    public java.util.List<LinkResponse> list() {
        return linkRepository.findAll().stream().map(LinkService::toResponse).toList();
    }

    @Transactional
    public void delete(UUID id) {
        if (!linkRepository.existsById(id)) {
            throw new NotFoundException("Link not found: " + id);
        }
        linkRepository.deleteById(id);
    }

    private Node requireNode(UUID id) {
        return nodeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Node not found: " + id));
    }

    private static LinkResponse toResponse(Link link) {
        return new LinkResponse(
                link.getId(),
                link.getSource().getId(),
                link.getTarget().getId(),
                link.getRelType(),
                link.getCreatedAt());
    }
}
