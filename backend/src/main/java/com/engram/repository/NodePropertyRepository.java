package com.engram.repository;

import com.engram.model.NodeProperty;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface NodePropertyRepository extends JpaRepository<NodeProperty, UUID> {

    List<NodeProperty> findByNodeIdOrderByName(UUID nodeId);

    Optional<NodeProperty> findByNodeIdAndName(UUID nodeId, String name);

    long deleteByNodeIdAndName(UUID nodeId, String name);

    @Query("select distinct p.name from NodeProperty p order by p.name")
    List<String> findDistinctNames();

    /** RELATION properties (on live pages) whose value points at the given node id. */
    @Query("""
            select p from NodeProperty p
            where p.type = com.engram.model.PropertyType.RELATION
              and p.value = :targetId
              and p.node.deletedAt is null
            """)
    List<NodeProperty> findRelationReferrers(String targetId);
}
