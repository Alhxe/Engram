package com.engram.web;

import com.engram.service.MindMapService;
import com.engram.web.dto.CreateMapRequest;
import com.engram.web.dto.MapDetailResponse;
import com.engram.web.dto.MapPlacementResponse;
import com.engram.web.dto.MapSummaryResponse;
import com.engram.web.dto.PlacementRequest;
import com.engram.web.dto.RenameMapRequest;
import jakarta.validation.Valid;
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

@RestController
@RequestMapping("/api/v1/maps")
public class MapController {

    private final MindMapService mindMapService;

    public MapController(MindMapService mindMapService) {
        this.mindMapService = mindMapService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MapSummaryResponse create(@Valid @RequestBody CreateMapRequest request) {
        return mindMapService.create(request);
    }

    @GetMapping
    public List<MapSummaryResponse> list(@RequestParam(required = false) UUID parentNodeId) {
        return mindMapService.list(parentNodeId);
    }

    @GetMapping("/{id}")
    public MapDetailResponse get(@PathVariable UUID id) {
        return mindMapService.getDetail(id);
    }

    @PutMapping("/{id}")
    public MapSummaryResponse rename(@PathVariable UUID id, @Valid @RequestBody RenameMapRequest request) {
        return mindMapService.rename(id, request.name());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        mindMapService.delete(id);
    }

    @PutMapping("/{id}/placements")
    public MapPlacementResponse upsertPlacement(@PathVariable UUID id, @Valid @RequestBody PlacementRequest request) {
        return mindMapService.upsertPlacement(id, request);
    }

    @DeleteMapping("/{id}/placements/{nodeId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removePlacement(@PathVariable UUID id, @PathVariable UUID nodeId) {
        mindMapService.removePlacement(id, nodeId);
    }
}
