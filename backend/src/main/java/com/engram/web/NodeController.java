package com.engram.web;

import com.engram.service.NodeService;
import com.engram.web.dto.BacklinkResponse;
import com.engram.web.dto.BreadcrumbItem;
import com.engram.web.dto.CreateNodeRequest;
import com.engram.web.dto.GlobalGraphItem;
import com.engram.web.dto.MoveNodeRequest;
import com.engram.web.dto.NodeResponse;
import com.engram.web.dto.NodeTreeItem;
import com.engram.web.dto.PageResponse;
import com.engram.web.dto.PositionRequest;
import com.engram.web.dto.PropertyDto;
import com.engram.web.dto.UpdateNodeRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
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

@RestController
@RequestMapping("/api/v1/nodes")
public class NodeController {

    private final NodeService nodeService;
    private final com.engram.service.ClipService clipService;
    private final com.engram.service.CsvImportService csvImportService;
    private final com.engram.service.SavedViewService savedViewService;
    private final com.engram.service.SmartCollectionService smartCollectionService;

    public NodeController(NodeService nodeService,
                          com.engram.service.ClipService clipService,
                          com.engram.service.CsvImportService csvImportService,
                          com.engram.service.SavedViewService savedViewService,
                          com.engram.service.SmartCollectionService smartCollectionService) {
        this.nodeService = nodeService;
        this.clipService = clipService;
        this.csvImportService = csvImportService;
        this.savedViewService = savedViewService;
        this.smartCollectionService = smartCollectionService;
    }

    @GetMapping("/{id}/subtree")
    public List<com.engram.web.dto.GuideSection> subtree(@PathVariable UUID id) {
        return nodeService.guide(id);
    }

    @PutMapping("/{id}/schema")
    public NodeResponse setSchema(
            @PathVariable UUID id, @RequestBody List<com.engram.web.dto.SchemaField> fields) {
        return nodeService.setSchema(id, fields);
    }

    @PutMapping("/{id}/smart-query")
    public NodeResponse setSmartQuery(
            @PathVariable UUID id, @RequestBody com.engram.web.dto.SmartQuery query) {
        return nodeService.setSmartQuery(id, query);
    }

    @GetMapping("/{id}/smart-results")
    public List<NodeResponse> smartResults(@PathVariable UUID id) {
        return smartCollectionService.results(nodeService.get(id).smartQuery());
    }

    @GetMapping("/{id}/views")
    public List<com.engram.web.dto.SavedViewResponse> views(@PathVariable UUID id) {
        return savedViewService.list(id);
    }

    @PostMapping("/{id}/views")
    @ResponseStatus(HttpStatus.CREATED)
    public com.engram.web.dto.SavedViewResponse createView(
            @PathVariable UUID id, @Valid @RequestBody com.engram.web.dto.CreateViewRequest request) {
        return savedViewService.create(id, request);
    }

    @DeleteMapping("/{id}/views/{viewId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteView(@PathVariable UUID id, @PathVariable UUID viewId) {
        savedViewService.delete(viewId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public NodeResponse create(@Valid @RequestBody CreateNodeRequest request) {
        return nodeService.create(request);
    }

    @PostMapping("/clip")
    @ResponseStatus(HttpStatus.CREATED)
    public NodeResponse clip(@Valid @RequestBody com.engram.web.dto.ClipRequest request) {
        return clipService.clip(request.url(), request.parentId());
    }

    @PostMapping(value = "/import-csv", consumes = "multipart/form-data")
    @ResponseStatus(HttpStatus.CREATED)
    public NodeResponse importCsv(
            @org.springframework.web.bind.annotation.RequestParam org.springframework.web.multipart.MultipartFile file,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String title) {
        try {
            return csvImportService.importCsv(file.getBytes(), file.getOriginalFilename(), title, null);
        } catch (java.io.IOException e) {
            throw new IllegalArgumentException("Could not read the CSV file");
        }
    }

    @PostMapping("/daily")
    public NodeResponse daily(@Valid @RequestBody com.engram.web.dto.DailyRequest request) {
        return nodeService.dailyNote(request.date());
    }

    @GetMapping("/{id}")
    public NodeResponse get(@PathVariable UUID id) {
        return nodeService.get(id);
    }

    @GetMapping
    public PageResponse<NodeResponse> list(
            @RequestParam(required = false) UUID parentId,
            @PageableDefault(size = 50, sort = "updatedAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return PageResponse.of(nodeService.list(parentId, pageable));
    }

    @GetMapping("/children")
    public List<NodeTreeItem> children(@RequestParam(required = false) UUID parentId) {
        return nodeService.children(parentId);
    }

    @GetMapping("/{id}/breadcrumb")
    public List<BreadcrumbItem> breadcrumb(@PathVariable UUID id) {
        return nodeService.breadcrumb(id);
    }

    @PutMapping("/{id}")
    public NodeResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateNodeRequest request) {
        return nodeService.update(id, request);
    }

    @PutMapping("/{id}/move")
    public NodeResponse move(@PathVariable UUID id, @RequestBody MoveNodeRequest request) {
        return nodeService.move(id, request.parentId());
    }

    @PostMapping("/{id}/merge")
    public NodeResponse merge(@PathVariable UUID id, @RequestParam UUID into) {
        return nodeService.merge(id, into);
    }

    @PutMapping("/reorder")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reorder(@RequestBody com.engram.web.dto.ReorderRequest request) {
        nodeService.reorder(request.orderedIds());
    }

    @PutMapping("/{id}/position")
    public NodeResponse updatePosition(@PathVariable UUID id, @RequestBody PositionRequest request) {
        return nodeService.updatePosition(id, request.x(), request.y(), request.color());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        nodeService.delete(id);
    }

    @GetMapping("/trash")
    public List<com.engram.web.dto.TrashItem> trash() {
        return nodeService.trash();
    }

    @PostMapping("/{id}/restore")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void restore(@PathVariable UUID id) {
        nodeService.restore(id);
    }

    @DeleteMapping("/{id}/purge")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void purge(@PathVariable UUID id) {
        nodeService.purge(id);
    }

    @DeleteMapping("/trash")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void emptyTrash() {
        nodeService.emptyTrash();
    }

    @GetMapping("/favorites")
    public List<NodeTreeItem> favorites() {
        return nodeService.favorites();
    }

    @GetMapping("/hygiene")
    public com.engram.web.dto.HygieneResponse hygiene() {
        return nodeService.hygiene();
    }

    @PutMapping("/{id}/favorite")
    public NodeResponse setFavorite(@PathVariable UUID id, @RequestBody com.engram.web.dto.FavoriteRequest request) {
        return nodeService.setFavorite(id, request.favorite());
    }

    @GetMapping("/templates")
    public List<NodeTreeItem> templates() {
        return nodeService.templates();
    }

    @GetMapping("/resurface")
    public List<NodeTreeItem> resurface() {
        return nodeService.resurface();
    }

    @PutMapping("/{id}/template")
    public NodeResponse setTemplate(@PathVariable UUID id, @RequestBody com.engram.web.dto.TemplateRequest request) {
        return nodeService.setTemplate(id, request.template());
    }

    @PostMapping("/{id}/instantiate")
    @ResponseStatus(HttpStatus.CREATED)
    public NodeResponse instantiate(@PathVariable UUID id, @RequestParam(required = false) UUID parentId) {
        return nodeService.instantiate(id, parentId);
    }

    @GetMapping("/{id}/backlinks")
    public List<BacklinkResponse> backlinks(@PathVariable UUID id) {
        return nodeService.backlinks(id);
    }

    @GetMapping("/{id}/property-backlinks")
    public List<com.engram.web.dto.PropertyBacklink> propertyBacklinks(@PathVariable UUID id) {
        return nodeService.propertyBacklinks(id);
    }

    @PutMapping("/{id}/share")
    public NodeResponse setShared(@PathVariable UUID id, @RequestBody com.engram.web.dto.ShareRequest request) {
        return nodeService.setShared(id, request.shared());
    }

    @GetMapping("/{id}/history")
    public List<com.engram.web.dto.RevisionResponse> history(@PathVariable UUID id) {
        return nodeService.history(id);
    }

    @PostMapping("/{id}/history/{revisionId}/restore")
    public NodeResponse restoreRevision(@PathVariable UUID id, @PathVariable UUID revisionId) {
        return nodeService.restoreRevision(id, revisionId);
    }

    @GetMapping("/graph")
    public List<GlobalGraphItem> globalGraph() {
        return nodeService.globalGraph();
    }

    @GetMapping("/{id}/graph")
    public com.engram.web.dto.LocalGraphResponse localGraph(@PathVariable UUID id) {
        return nodeService.localGraph(id);
    }

    @GetMapping("/{id}/unlinked-mentions")
    public List<com.engram.web.dto.UnlinkedMention> unlinkedMentions(@PathVariable UUID id) {
        return nodeService.unlinkedMentions(id);
    }

    @PutMapping("/{id}/properties")
    public NodeResponse upsertProperty(@PathVariable UUID id, @Valid @RequestBody PropertyDto request) {
        return nodeService.upsertProperty(id, request);
    }

    @DeleteMapping("/{id}/properties")
    public NodeResponse deleteProperty(@PathVariable UUID id, @RequestParam String name) {
        return nodeService.deleteProperty(id, name);
    }
}
