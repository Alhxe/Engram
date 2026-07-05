package com.engram.repository;

import com.engram.model.Link;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LinkRepository extends JpaRepository<Link, UUID> {

    List<Link> findBySourceId(UUID sourceId);

    /** Backlinks: every link pointing at the given node. */
    List<Link> findByTargetId(UUID targetId);

    /** Links whose endpoints are both within the given set (edges inside a map). */
    List<Link> findBySourceIdInAndTargetIdIn(Collection<UUID> sourceIds, Collection<UUID> targetIds);
}
