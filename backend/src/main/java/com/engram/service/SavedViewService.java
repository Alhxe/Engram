package com.engram.service;

import com.engram.model.SavedView;
import com.engram.repository.SavedViewRepository;
import com.engram.web.dto.CreateViewRequest;
import com.engram.web.dto.SavedViewResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SavedViewService {

    private final SavedViewRepository repository;

    public SavedViewService(SavedViewRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<SavedViewResponse> list(UUID nodeId) {
        return repository.findByNodeIdOrderByName(nodeId).stream()
                .map(SavedViewService::toResponse)
                .toList();
    }

    @Transactional
    public SavedViewResponse create(UUID nodeId, CreateViewRequest request) {
        SavedView view = new SavedView();
        view.setNodeId(nodeId);
        view.setName(request.name().trim());
        view.setMode(request.mode());
        view.setGroupBy(request.groupBy());
        view.setDateBy(request.dateBy());
        view.setSortCol(request.sortCol());
        view.setSortDir(request.sortDir() == 0 ? 1 : request.sortDir());
        view.setFilterText(request.filterText());
        return toResponse(repository.saveAndFlush(view));
    }

    @Transactional
    public void delete(UUID viewId) {
        repository.deleteById(viewId);
    }

    private static SavedViewResponse toResponse(SavedView view) {
        return new SavedViewResponse(
                view.getId(), view.getName(), view.getMode(), view.getGroupBy(),
                view.getDateBy(), view.getSortCol(), view.getSortDir(), view.getFilterText());
    }
}
