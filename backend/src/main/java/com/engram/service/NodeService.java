package com.engram.service;

import com.engram.model.Link;
import com.engram.model.Node;
import com.engram.model.NodeKind;
import com.engram.model.NodeProperty;
import com.engram.model.PageLayout;
import com.engram.model.PropertyType;
import com.engram.repository.LinkRepository;
import com.engram.repository.NodePropertyRepository;
import com.engram.repository.NodeRepository;
import com.engram.web.dto.BacklinkResponse;
import com.engram.web.dto.BreadcrumbItem;
import com.engram.web.dto.CreateNodeRequest;
import com.engram.web.dto.GlobalGraphItem;
import com.engram.web.dto.NodeResponse;
import com.engram.web.dto.NodeTreeItem;
import com.engram.web.dto.PropertyDto;
import com.engram.web.dto.UpdateNodeRequest;
import com.engram.web.error.NotFoundException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NodeService {

    private static final int MAX_REVISIONS = 50;
    private static final long REVISION_THROTTLE_MINUTES = 3;

    private final NodeRepository nodeRepository;
    private final LinkRepository linkRepository;
    private final NodePropertyRepository propertyRepository;
    private final com.engram.repository.NodeRevisionRepository revisionRepository;
    private final TagService tagService;
    private final org.springframework.context.ApplicationEventPublisher events;
    private final com.fasterxml.jackson.databind.ObjectMapper mapper;

    public NodeService(NodeRepository nodeRepository,
                       LinkRepository linkRepository,
                       NodePropertyRepository propertyRepository,
                       com.engram.repository.NodeRevisionRepository revisionRepository,
                       TagService tagService,
                       org.springframework.context.ApplicationEventPublisher events,
                       com.fasterxml.jackson.databind.ObjectMapper mapper) {
        this.nodeRepository = nodeRepository;
        this.linkRepository = linkRepository;
        this.propertyRepository = propertyRepository;
        this.revisionRepository = revisionRepository;
        this.tagService = tagService;
        this.events = events;
        this.mapper = mapper;
    }

    @Transactional
    public NodeResponse create(CreateNodeRequest request) {
        Node node = new Node();
        node.setTitle(request.title());
        node.setContent(request.content());
        node.setKind(request.kind() != null ? request.kind() : NodeKind.NOTE);
        node.setLayout(request.layout() != null ? request.layout() : PageLayout.DOCUMENT);
        Node parent = resolveParent(request.parentId());
        node.setParent(parent);
        node.setPosition((parent != null
                ? nodeRepository.maxPositionForParent(parent.getId())
                : nodeRepository.maxPositionForRoot()) + 1);
        node.getTags().addAll(tagService.resolve(request.tags()));
        Node saved = nodeRepository.saveAndFlush(node);
        applyParentSchema(saved);
        events.publishEvent(new NodeChangeEvent("created", saved.getId(), saved.getTitle()));
        return toResponse(saved);
    }

    /** When a page has a collection schema, new children get those (empty) properties. */
    private void applyParentSchema(Node child) {
        if (child.getParent() == null || child.getParent().getCollectionSchema() == null) {
            return;
        }
        for (com.engram.web.dto.SchemaField field : parseSchema(child.getParent().getCollectionSchema())) {
            if (field.name() != null && !field.name().isBlank()) {
                upsertProperty(child.getId(), new PropertyDto(
                        field.name().trim(),
                        field.type() != null ? field.type() : PropertyType.TEXT,
                        null));
            }
        }
    }

    @Transactional
    public NodeResponse setSchema(UUID id, List<com.engram.web.dto.SchemaField> fields) {
        Node node = requireNode(id);
        try {
            node.setCollectionSchema(fields == null || fields.isEmpty() ? null : mapper.writeValueAsString(fields));
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid schema");
        }
        return toResponse(nodeRepository.saveAndFlush(node));
    }

    @Transactional
    public NodeResponse setSmartQuery(UUID id, com.engram.web.dto.SmartQuery query) {
        Node node = requireNode(id);
        try {
            node.setSmartQuery(query == null || query.isEmpty() ? null : mapper.writeValueAsString(query));
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid query");
        }
        return toResponse(nodeRepository.saveAndFlush(node));
    }

    private com.engram.web.dto.SmartQuery parseSmartQuery(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return mapper.readValue(json, com.engram.web.dto.SmartQuery.class);
        } catch (Exception e) {
            return null;
        }
    }

    private List<com.engram.web.dto.SchemaField> parseSchema(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return mapper.readValue(json, mapper.getTypeFactory()
                    .constructCollectionType(List.class, com.engram.web.dto.SchemaField.class));
        } catch (Exception e) {
            return List.of();
        }
    }

    @Transactional(readOnly = true)
    public NodeResponse get(UUID id) {
        return toResponse(requireNode(id));
    }

    @Transactional(readOnly = true)
    public Page<NodeResponse> list(UUID parentId, Pageable pageable) {
        Page<Node> nodes;
        if (parentId != null) {
            // Children of a page follow their manual (drag & drop) order.
            Pageable ordered = org.springframework.data.domain.PageRequest.of(
                    pageable.getPageNumber(), pageable.getPageSize(),
                    org.springframework.data.domain.Sort.by(
                            org.springframework.data.domain.Sort.Order.asc("position"),
                            org.springframework.data.domain.Sort.Order.asc("createdAt")));
            nodes = nodeRepository.findByParentIdAndDeletedAtIsNull(parentId, ordered);
        } else {
            nodes = nodeRepository.findByDeletedAtIsNull(pageable);
        }
        return nodes.map(this::toResponse);
    }

    /** Persist a new sibling order (drag & drop of sub-pages). */
    @Transactional
    public void reorder(List<UUID> orderedIds) {
        if (orderedIds == null || orderedIds.isEmpty()) {
            return;
        }
        int position = 0;
        for (UUID id : orderedIds) {
            Node node = nodeRepository.findById(id).orElse(null);
            if (node != null) {
                node.setPosition(position++);
            }
        }
    }

    /** Children of a node (or root pages when parentId is null), for the tree. */
    @Transactional(readOnly = true)
    public List<NodeTreeItem> children(UUID parentId) {
        List<Node> nodes = parentId != null
                ? nodeRepository.findByParentIdAndDeletedAtIsNullOrderByTitleAsc(parentId)
                : nodeRepository.findByParentIsNullAndDeletedAtIsNullOrderByTitleAsc();
        return nodes.stream()
                .map(node -> new NodeTreeItem(
                        node.getId(), node.getTitle(), node.getKind(), node.getLayout(),
                        nodeRepository.existsByParentIdAndDeletedAtIsNull(node.getId())))
                .toList();
    }

    /** Ancestors from root down to (and including) the node. */
    @Transactional(readOnly = true)
    public List<BreadcrumbItem> breadcrumb(UUID id) {
        List<BreadcrumbItem> trail = new ArrayList<>();
        Node current = requireNode(id);
        while (current != null) {
            trail.add(new BreadcrumbItem(current.getId(), current.getTitle()));
            current = current.getParent();
        }
        Collections.reverse(trail);
        return trail;
    }

    @Transactional
    public NodeResponse update(UUID id, UpdateNodeRequest request) {
        Node node = requireNode(id);
        node.setTitle(request.title());
        node.setContent(request.content());
        node.setKind(request.kind() != null ? request.kind() : NodeKind.NOTE);
        node.setLayout(request.layout() != null ? request.layout() : PageLayout.DOCUMENT);
        node.setParent(resolveParent(request.parentId(), node));
        node.getTags().clear();
        node.getTags().addAll(tagService.resolve(request.tags()));
        Node saved = nodeRepository.saveAndFlush(node);
        snapshot(saved, false);
        return toResponse(saved);
    }

    /** Save a version snapshot, throttled so a burst of autosaves collapses into one. */
    private void snapshot(Node node, boolean force) {
        if (!force) {
            var latest = revisionRepository.findFirstByNodeIdOrderByCreatedAtDesc(node.getId());
            java.time.Instant cutoff = java.time.Instant.now().minus(REVISION_THROTTLE_MINUTES, java.time.temporal.ChronoUnit.MINUTES);
            if (latest.isPresent() && latest.get().getCreatedAt().isAfter(cutoff)) {
                return;
            }
        }
        com.engram.model.NodeRevision revision = new com.engram.model.NodeRevision();
        revision.setNodeId(node.getId());
        revision.setTitle(node.getTitle());
        revision.setContent(node.getContent());
        revisionRepository.save(revision);

        List<com.engram.model.NodeRevision> all = revisionRepository.findByNodeIdOrderByCreatedAtDesc(node.getId());
        if (all.size() > MAX_REVISIONS) {
            revisionRepository.deleteAll(all.subList(MAX_REVISIONS, all.size()));
        }
    }

    @Transactional(readOnly = true)
    public List<com.engram.web.dto.RevisionResponse> history(UUID id) {
        requireNode(id);
        return revisionRepository.findByNodeIdOrderByCreatedAtDesc(id).stream()
                .map(r -> new com.engram.web.dto.RevisionResponse(
                        r.getId(), r.getCreatedAt(), r.getTitle(), preview(r.getContent())))
                .toList();
    }

    @Transactional
    public NodeResponse restoreRevision(UUID id, UUID revisionId) {
        Node node = requireNode(id);
        com.engram.model.NodeRevision revision = revisionRepository.findById(revisionId)
                .orElseThrow(() -> new NotFoundException("Revision not found: " + revisionId));
        if (!revision.getNodeId().equals(id)) {
            throw new IllegalArgumentException("Revision does not belong to this page");
        }
        snapshot(node, true); // keep the current state before overwriting
        node.setTitle(revision.getTitle());
        node.setContent(revision.getContent());
        return toResponse(nodeRepository.saveAndFlush(node));
    }

    private String preview(String html) {
        if (html == null) {
            return "";
        }
        String text = html.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim();
        return text.length() > 140 ? text.substring(0, 140) + "…" : text;
    }

    /** Soft-delete: move the page and its whole subtree to the trash. */
    @Transactional
    public void delete(UUID id) {
        java.time.Instant now = java.time.Instant.now();
        List<Node> subtree = subtree(id);
        subtree.forEach(node -> {
            if (node.getDeletedAt() == null) {
                node.setDeletedAt(now);
            }
        });
        nodeRepository.saveAll(subtree);
        events.publishEvent(new NodeChangeEvent("deleted", id, subtree.get(0).getTitle()));
    }

    @Transactional
    public void restore(UUID id) {
        List<Node> subtree = subtree(id);
        subtree.forEach(node -> node.setDeletedAt(null));
        nodeRepository.saveAll(subtree);
    }

    /** Permanently remove a trashed page and its subtree (leaves first, for FKs). */
    @Transactional
    public void purge(UUID id) {
        List<Node> subtree = subtree(id);
        java.util.Collections.reverse(subtree);
        nodeRepository.deleteAll(subtree);
    }

    @Transactional(readOnly = true)
    public List<com.engram.web.dto.TrashItem> trash() {
        return nodeRepository.findTrashRoots().stream()
                .map(node -> new com.engram.web.dto.TrashItem(
                        node.getId(), node.getTitle(), node.getKind(), node.getDeletedAt()))
                .toList();
    }

    @Transactional
    public void emptyTrash() {
        nodeRepository.findTrashRoots().forEach(root -> purge(root.getId()));
    }

    /** Trash every page created by a given AI import (undo an ingestion). */
    @Transactional
    public int undoImport(UUID importId) {
        java.time.Instant now = java.time.Instant.now();
        List<Node> nodes = nodeRepository.findByImportId(importId);
        nodes.forEach(node -> {
            if (node.getDeletedAt() == null) {
                node.setDeletedAt(now);
            }
        });
        nodeRepository.saveAll(nodes);
        return nodes.size();
    }

    /** A node plus all its descendants (pre-order: ancestors before descendants). */
    private List<Node> subtree(UUID id) {
        List<Node> all = new ArrayList<>();
        java.util.Deque<Node> stack = new java.util.ArrayDeque<>();
        stack.push(requireNode(id));
        while (!stack.isEmpty()) {
            Node node = stack.pop();
            all.add(node);
            nodeRepository.findByParentId(node.getId()).forEach(stack::push);
        }
        return all;
    }

    /** Get-or-create today's journal entry (a dated child of a "Journal" root page). */
    @Transactional
    public NodeResponse dailyNote(String date) {
        String day = date == null ? "" : date.trim();
        if (day.isBlank()) {
            throw new IllegalArgumentException("A date is required");
        }
        cleanupEmptyJournalEntries(); // opening the journal tidies past empty days
        Node journal = nodeRepository.findByTitleIgnoreCaseAndDeletedAtIsNull("Journal").stream()
                .filter(n -> n.getParent() == null)
                .findFirst()
                .orElseGet(() -> {
                    Node created = new Node();
                    created.setTitle("Journal");
                    created.setLayout(PageLayout.DOCUMENT);
                    return nodeRepository.saveAndFlush(created);
                });
        Node daily = nodeRepository.findByParentIdAndDeletedAtIsNullOrderByTitleAsc(journal.getId()).stream()
                .filter(n -> day.equals(n.getTitle()))
                .findFirst()
                .orElseGet(() -> {
                    Node created = new Node();
                    created.setTitle(day);
                    created.setParent(journal);
                    return nodeRepository.saveAndFlush(created);
                });
        return toResponse(daily);
    }

    /** Trash past journal entries that were opened but never written to (blank
     *  content, no sub-pages), so empty days don't pile up. Today's entry is
     *  always kept. Soft delete — restorable from the trash. Returns the count. */
    @Transactional
    public int cleanupEmptyJournalEntries() {
        Node journal = nodeRepository.findByTitleIgnoreCaseAndDeletedAtIsNull("Journal").stream()
                .filter(n -> n.getParent() == null)
                .findFirst()
                .orElse(null);
        if (journal == null) {
            return 0;
        }
        String today = LocalDate.now().toString();
        Instant now = Instant.now();
        List<Node> trashed = new ArrayList<>();
        for (Node entry : nodeRepository.findByParentIdAndDeletedAtIsNullOrderByTitleAsc(journal.getId())) {
            String title = entry.getTitle();
            // only dated entries (yyyy-MM-dd), and never today's
            if (title == null || !title.matches("\\d{4}-\\d{2}-\\d{2}") || today.equals(title)) {
                continue;
            }
            boolean blank = isEffectivelyEmpty(entry.getContent());
            boolean noChildren =
                    nodeRepository.findByParentIdAndDeletedAtIsNullOrderByTitleAsc(entry.getId()).isEmpty();
            if (blank && noChildren) {
                entry.setDeletedAt(now);
                trashed.add(entry);
            }
        }
        nodeRepository.saveAll(trashed);
        return trashed.size();
    }

    /** True when HTML content carries no visible text (null, "", "<p></p>", &nbsp; …). */
    private static boolean isEffectivelyEmpty(String html) {
        if (html == null) {
            return true;
        }
        return html.replaceAll("<[^>]*>", "").replace("&nbsp;", " ").trim().isEmpty();
    }

    /** Merge {@code sourceId} INTO {@code targetId}: fold its tags, missing
     *  properties, children and links into the target, then trash the source. */
    @Transactional
    public NodeResponse merge(UUID sourceId, UUID targetId) {
        if (sourceId.equals(targetId)) {
            throw new IllegalArgumentException("A page cannot be merged into itself");
        }
        Node source = requireNode(sourceId);
        Node target = requireNode(targetId);

        // Tags
        target.getTags().addAll(source.getTags());

        // Properties the target doesn't already have
        java.util.Set<String> targetProps = propertyRepository.findByNodeIdOrderByName(targetId).stream()
                .map(NodeProperty::getName).collect(java.util.stream.Collectors.toSet());
        for (NodeProperty property : propertyRepository.findByNodeIdOrderByName(sourceId)) {
            if (!targetProps.contains(property.getName())) {
                NodeProperty copy = new NodeProperty();
                copy.setNode(target);
                copy.setName(property.getName());
                copy.setType(property.getType());
                copy.setValue(property.getValue());
                propertyRepository.save(copy);
            }
        }

        // Re-parent live children onto the target (before the source is trashed)
        for (Node child : nodeRepository.findByParentId(sourceId)) {
            child.setParent(target);
            nodeRepository.save(child);
        }

        // Re-point links, dropping any that would duplicate an existing edge
        java.util.Set<UUID> outTargets = linkRepository.findBySourceId(targetId).stream()
                .map(link -> link.getTarget().getId()).collect(java.util.stream.Collectors.toSet());
        for (Link link : linkRepository.findBySourceId(sourceId)) {
            UUID other = link.getTarget().getId();
            if (other.equals(targetId) || !outTargets.add(other)) {
                linkRepository.delete(link);
            } else {
                link.setSource(target);
                linkRepository.save(link);
            }
        }
        java.util.Set<UUID> inSources = linkRepository.findByTargetId(targetId).stream()
                .map(link -> link.getSource().getId()).collect(java.util.stream.Collectors.toSet());
        for (Link link : linkRepository.findByTargetId(sourceId)) {
            UUID other = link.getSource().getId();
            if (other.equals(targetId) || !inSources.add(other)) {
                linkRepository.delete(link);
            } else {
                link.setTarget(target);
                linkRepository.save(link);
            }
        }

        nodeRepository.saveAndFlush(target);
        delete(sourceId); // soft-delete the now-emptied source
        return toResponse(requireNode(targetId));
    }

    /** Reparent a page (drag & drop in the tree), leaving its content untouched. */
    @Transactional
    public NodeResponse move(UUID id, UUID parentId) {
        Node node = requireNode(id);
        node.setParent(resolveParent(parentId, node));
        return toResponse(nodeRepository.saveAndFlush(node));
    }

    /** Set a node's position/color on its parent page's mind-map canvas. */
    @Transactional
    public NodeResponse updatePosition(UUID id, Double x, Double y, String color) {
        Node node = requireNode(id);
        node.setMapX(x);
        node.setMapY(y);
        node.setMapColor(color);
        return toResponse(nodeRepository.saveAndFlush(node));
    }

    @Transactional
    public NodeResponse upsertProperty(UUID nodeId, PropertyDto request) {
        Node node = requireNode(nodeId);
        NodeProperty property = propertyRepository.findByNodeIdAndName(nodeId, request.name())
                .orElseGet(() -> {
                    NodeProperty created = new NodeProperty();
                    created.setNode(node);
                    created.setName(request.name());
                    return created;
                });
        property.setType(request.type() != null ? request.type() : PropertyType.TEXT);
        property.setValue(request.value());
        propertyRepository.saveAndFlush(property);
        return toResponse(node);
    }

    @Transactional
    public NodeResponse deleteProperty(UUID nodeId, String name) {
        Node node = requireNode(nodeId);
        propertyRepository.deleteByNodeIdAndName(nodeId, name);
        return toResponse(node);
    }

    @Transactional(readOnly = true)
    public List<BacklinkResponse> backlinks(UUID id) {
        requireNode(id);
        return linkRepository.findByTargetId(id).stream()
                .filter(link -> link.getSource().getDeletedAt() == null)
                .map(link -> new BacklinkResponse(
                        link.getId(),
                        link.getSource().getId(),
                        link.getSource().getTitle(),
                        link.getSource().getKind(),
                        link.getRelType()))
                .toList();
    }

    /** Pages that point at this page via a RELATION property (inverse of a relation). */
    @Transactional(readOnly = true)
    public List<com.engram.web.dto.PropertyBacklink> propertyBacklinks(UUID id) {
        requireNode(id);
        return propertyRepository.findRelationReferrers(id.toString()).stream()
                .map(p -> new com.engram.web.dto.PropertyBacklink(
                        p.getNode().getId(), p.getNode().getTitle(), p.getName()))
                .toList();
    }

    @Transactional
    public NodeResponse setFavorite(UUID id, boolean favorite) {
        Node node = requireNode(id);
        node.setFavorite(favorite);
        return toResponse(nodeRepository.saveAndFlush(node));
    }

    private final java.security.SecureRandom shareRandom = new java.security.SecureRandom();

    @Transactional
    public NodeResponse setShared(UUID id, boolean shared) {
        Node node = requireNode(id);
        if (shared) {
            if (node.getShareToken() == null) {
                byte[] bytes = new byte[16];
                shareRandom.nextBytes(bytes);
                node.setShareToken(java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(bytes));
            }
        } else {
            node.setShareToken(null);
        }
        return toResponse(nodeRepository.saveAndFlush(node));
    }

    @Transactional(readOnly = true)
    public com.engram.web.dto.PublicPageResponse publicPage(String token) {
        Node node = nodeRepository.findByShareTokenAndDeletedAtIsNull(token)
                .orElseThrow(() -> new NotFoundException("Page not found"));
        return new com.engram.web.dto.PublicPageResponse(
                node.getTitle(), node.getContent(), node.getUpdatedAt());
    }

    @Transactional
    public NodeResponse setTemplate(UUID id, boolean template) {
        Node node = requireNode(id);
        node.setTemplate(template);
        return toResponse(nodeRepository.saveAndFlush(node));
    }

    /** A few random old pages to resurface on the home screen. */
    @Transactional(readOnly = true)
    public List<NodeTreeItem> resurface() {
        return nodeRepository.findRandom(4).stream()
                .map(node -> new NodeTreeItem(
                        node.getId(), node.getTitle(), node.getKind(), node.getLayout(), false))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<NodeTreeItem> templates() {
        return nodeRepository.findByTemplateTrueAndDeletedAtIsNullOrderByTitleAsc().stream()
                .map(node -> new NodeTreeItem(
                        node.getId(), node.getTitle(), node.getKind(), node.getLayout(),
                        nodeRepository.existsByParentIdAndDeletedAtIsNull(node.getId())))
                .toList();
    }

    /** Create a new page by copying a template's content, layout, tags and properties. */
    @Transactional
    public NodeResponse instantiate(UUID templateId, UUID parentId) {
        Node source = requireNode(templateId);
        Node copy = new Node();
        copy.setTitle(source.getTitle());
        copy.setContent(source.getContent());
        copy.setKind(source.getKind());
        copy.setLayout(source.getLayout());
        copy.setParent(resolveParent(parentId));
        copy.getTags().addAll(source.getTags());
        Node saved = nodeRepository.saveAndFlush(copy);

        for (NodeProperty property : propertyRepository.findByNodeIdOrderByName(source.getId())) {
            NodeProperty created = new NodeProperty();
            created.setNode(saved);
            created.setName(property.getName());
            created.setType(property.getType());
            created.setValue(property.getValue());
            propertyRepository.saveAndFlush(created);
        }
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<NodeTreeItem> favorites() {
        return nodeRepository.findByFavoriteTrueAndDeletedAtIsNullOrderByTitleAsc().stream()
                .map(node -> new NodeTreeItem(
                        node.getId(), node.getTitle(), node.getKind(), node.getLayout(),
                        nodeRepository.existsByParentIdAndDeletedAtIsNull(node.getId())))
                .toList();
    }

    /** Every live page, stripped to what the global graph needs. One cheap query. */
    @Transactional(readOnly = true)
    public List<GlobalGraphItem> globalGraph() {
        return nodeRepository.findGraphItems();
    }

    /** The one-hop connection graph of a page: its neighbors and the links between. */
    @Transactional(readOnly = true)
    public com.engram.web.dto.LocalGraphResponse localGraph(UUID id) {
        Node center = requireNode(id);
        List<com.engram.web.dto.GraphNodeDto> nodes = new ArrayList<>();
        List<com.engram.web.dto.GraphEdgeDto> edges = new ArrayList<>();
        java.util.Set<UUID> seen = new java.util.HashSet<>();

        nodes.add(new com.engram.web.dto.GraphNodeDto(center.getId(), center.getTitle(), true));
        seen.add(center.getId());

        for (Link link : linkRepository.findBySourceId(id)) {
            Node target = link.getTarget();
            if (target.getDeletedAt() != null) {
                continue;
            }
            if (seen.add(target.getId())) {
                nodes.add(new com.engram.web.dto.GraphNodeDto(target.getId(), target.getTitle(), false));
            }
            edges.add(new com.engram.web.dto.GraphEdgeDto(id, target.getId(), link.getRelType()));
        }
        for (Link link : linkRepository.findByTargetId(id)) {
            Node source = link.getSource();
            if (source.getDeletedAt() != null) {
                continue;
            }
            if (seen.add(source.getId())) {
                nodes.add(new com.engram.web.dto.GraphNodeDto(source.getId(), source.getTitle(), false));
            }
            edges.add(new com.engram.web.dto.GraphEdgeDto(source.getId(), id, link.getRelType()));
        }
        return new com.engram.web.dto.LocalGraphResponse(nodes, edges);
    }

    /** Pages that mention this page's title in their text but don't link to it yet. */
    @Transactional(readOnly = true)
    public List<com.engram.web.dto.UnlinkedMention> unlinkedMentions(UUID id) {
        Node node = requireNode(id);
        String title = node.getTitle() == null ? "" : node.getTitle().trim();
        if (title.length() < 3) {
            return List.of();
        }
        return nodeRepository.findUnlinkedMentions(id, title).stream()
                .limit(20)
                .map(n -> new com.engram.web.dto.UnlinkedMention(n.getId(), n.getTitle()))
                .toList();
    }

    /** Pages worth revisiting: graph islands, untagged, and long-untouched. */
    @Transactional(readOnly = true)
    public com.engram.web.dto.HygieneResponse hygiene() {
        org.springframework.data.domain.Pageable limit = org.springframework.data.domain.PageRequest.of(0, 50);
        java.time.Instant cutoff = java.time.Instant.now().minus(90, java.time.temporal.ChronoUnit.DAYS);
        return new com.engram.web.dto.HygieneResponse(
                toTreeItems(nodeRepository.findOrphans(limit)),
                toTreeItems(nodeRepository.findUntagged(limit)),
                toTreeItems(nodeRepository.findStale(cutoff, limit)));
    }

    private List<NodeTreeItem> toTreeItems(List<Node> nodes) {
        return nodes.stream()
                .map(node -> new NodeTreeItem(
                        node.getId(), node.getTitle(), node.getKind(), node.getLayout(),
                        nodeRepository.existsByParentIdAndDeletedAtIsNull(node.getId())))
                .toList();
    }

    private Node requireNode(UUID id) {
        return nodeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Node not found: " + id));
    }

    private Node resolveParent(UUID parentId) {
        return resolveParent(parentId, null);
    }

    private Node resolveParent(UUID parentId, Node moving) {
        if (parentId == null) {
            return null;
        }
        Node parent = requireNode(parentId);
        if (moving != null) {
            // Prevent cycles: a node cannot be its own ancestor.
            for (Node cursor = parent; cursor != null; cursor = cursor.getParent()) {
                if (cursor.getId().equals(moving.getId())) {
                    throw new IllegalArgumentException("A page cannot be moved inside itself");
                }
            }
        }
        return parent;
    }

    private NodeResponse toResponse(Node node) {
        List<String> tags = node.getTags().stream()
                .map(tag -> tag.getName())
                .sorted()
                .toList();
        List<PropertyDto> properties = propertyRepository.findByNodeIdOrderByName(node.getId()).stream()
                .map(property -> new PropertyDto(property.getName(), property.getType(), property.getValue()))
                .toList();
        UUID parentId = node.getParent() != null ? node.getParent().getId() : null;
        return new NodeResponse(
                node.getId(),
                node.getTitle(),
                node.getContent(),
                node.getKind(),
                node.getLayout(),
                parentId,
                nodeRepository.existsByParentIdAndDeletedAtIsNull(node.getId()),
                node.isFavorite(),
                node.isTemplate(),
                node.getShareToken(),
                parseSchema(node.getCollectionSchema()),
                parseSmartQuery(node.getSmartQuery()),
                tags,
                properties,
                node.getMapX(),
                node.getMapY(),
                node.getMapColor(),
                node.getCreatedAt(),
                node.getUpdatedAt());
    }
}
