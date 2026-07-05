package com.engram.repository;

import com.engram.model.SavedView;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SavedViewRepository extends JpaRepository<SavedView, UUID> {

    List<SavedView> findByNodeIdOrderByName(UUID nodeId);
}
