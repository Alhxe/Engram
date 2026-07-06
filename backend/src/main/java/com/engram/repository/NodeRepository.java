package com.engram.repository;

import com.engram.model.Node;
import com.engram.web.dto.GlobalGraphItem;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface NodeRepository extends JpaRepository<Node, UUID> {

    // --- Live nodes only (deleted_at IS NULL) ---

    Page<Node> findByParentIdAndDeletedAtIsNull(UUID parentId, Pageable pageable);

    Page<Node> findByDeletedAtIsNull(Pageable pageable);

    List<Node> findByParentIdAndDeletedAtIsNullOrderByTitleAsc(UUID parentId);

    List<Node> findByParentIsNullAndDeletedAtIsNullOrderByTitleAsc();

    boolean existsByParentIdAndDeletedAtIsNull(UUID parentId);

    List<Node> findByTitleIgnoreCaseAndDeletedAtIsNull(String title);

    List<Node> findByFavoriteTrueAndDeletedAtIsNullOrderByTitleAsc();

    List<Node> findByTemplateTrueAndDeletedAtIsNullOrderByTitleAsc();

    java.util.Optional<Node> findByShareTokenAndDeletedAtIsNull(String shareToken);

    @Query(value = "SELECT * FROM node WHERE deleted_at IS NULL AND title <> '' ORDER BY RANDOM() LIMIT :count", nativeQuery = true)
    List<Node> findRandom(int count);

    @Query("select n.title from Node n where n.title <> '' and n.deletedAt is null")
    List<String> findAllTitles();

    /** Every live page as a graph item — left join keeps the parentless roots. */
    @Query("""
            select new com.engram.web.dto.GlobalGraphItem(n.id, n.title, p.id)
            from Node n left join n.parent p
            where n.deletedAt is null
            """)
    List<GlobalGraphItem> findGraphItems();

    // --- Trash ---

    /** Roots of deleted subtrees: deleted nodes whose parent is not itself deleted. */
    @Query("""
            select n from Node n
            where n.deletedAt is not null
              and (n.parent is null or n.parent.deletedAt is null)
            order by n.deletedAt desc
            """)
    List<Node> findTrashRoots();

    List<Node> findByParentId(UUID parentId);

    @Query("select coalesce(max(n.position), -1) from Node n where n.parent.id = :parentId")
    int maxPositionForParent(UUID parentId);

    @Query("select coalesce(max(n.position), -1) from Node n where n.parent is null")
    int maxPositionForRoot();

    // --- Data hygiene ---

    /** Live pages with no links (in or out) and no children: islands off the graph. */
    @Query("""
            select n from Node n
            where n.deletedAt is null and n.title <> ''
              and not exists (select 1 from Link l where l.source = n or l.target = n)
              and not exists (select 1 from Node c where c.parent = n and c.deletedAt is null)
            order by n.updatedAt desc
            """)
    List<Node> findOrphans(Pageable pageable);

    /** Live pages carrying no tags. */
    @Query("select n from Node n where n.deletedAt is null and n.title <> '' and n.tags is empty order by n.updatedAt desc")
    List<Node> findUntagged(Pageable pageable);

    /** Live pages carrying a given tag (by tag name). */
    @Query("select n from Node n join n.tags t where t.name = :tag and n.deletedAt is null")
    List<Node> findByTagName(String tag);

    /** Live pages that are publicly shared (the digital garden). */
    @Query("select n from Node n where n.shareToken is not null and n.deletedAt is null order by n.updatedAt desc")
    List<Node> findShared();

    /** Live pages not touched since the cutoff. */
    @Query("select n from Node n where n.deletedAt is null and n.title <> '' and n.updatedAt < :cutoff order by n.updatedAt asc")
    List<Node> findStale(java.time.Instant cutoff, Pageable pageable);

    List<Node> findByImportId(UUID importId);

    /** Live pages whose title/content mentions the given text but don't yet link to :id. */
    @Query("""
            select n from Node n
            where n.deletedAt is null and n.id <> :id
              and (lower(n.title) like lower(concat('%', :title, '%'))
                   or lower(n.content) like lower(concat('%', :title, '%')))
              and not exists (select 1 from Link l where l.source = n and l.target.id = :id)
            order by n.updatedAt desc
            """)
    List<Node> findUnlinkedMentions(UUID id, String title);

    @Modifying
    @Query("update Node n set n.importId = :importId where n.id in :ids")
    void assignImportId(List<UUID> ids, UUID importId);
}
