package com.engram.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

/**
 * The atomic unit of knowledge. Everything — a note, a mind-map branch, a
 * snippet or a bookmark — is a {@code Node}; the {@link NodeKind} only changes
 * how it is rendered, not how it is stored or searched.
 */
@Entity
@Table(name = "node")
@Getter
@Setter
@NoArgsConstructor
public class Node {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(columnDefinition = "text")
    private UUID id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "text")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NodeKind kind = NodeKind.NOTE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PageLayout layout = PageLayout.DOCUMENT;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Node parent;

    @ManyToMany
    @JoinTable(
            name = "node_tag",
            joinColumns = @JoinColumn(name = "node_id"),
            inverseJoinColumns = @JoinColumn(name = "tag_id"))
    private Set<Tag> tags = new LinkedHashSet<>();

    /** Position and color on the parent page's mind-map canvas (null = auto). */
    @Column(name = "map_x")
    private Double mapX;

    @Column(name = "map_y")
    private Double mapY;

    @Column(name = "map_color")
    private String mapColor;

    /** Manual sort order among siblings (drag & drop); lower comes first. */
    @Column(name = "position", nullable = false)
    private int position = 0;

    @Column(nullable = false)
    private boolean favorite = false;

    @Column(name = "is_template", nullable = false)
    private boolean template = false;

    /** Unguessable token that makes this page publicly readable; null = private. */
    @Column(name = "share_token")
    private String shareToken;

    /** JSON list of {name,type} this page's children should have (a collection schema). */
    @Column(name = "collection_schema", columnDefinition = "text")
    private String collectionSchema;

    /** JSON query that makes this page a smart collection (matches pages base-wide). */
    @Column(name = "smart_query", columnDefinition = "text")
    private String smartQuery;

    /** Soft-delete timestamp; null means the node is live (not in the trash). */
    @Column(name = "deleted_at")
    private Instant deletedAt;

    /** Groups all pages created by a single AI import, so they can be undone together. */
    @Column(name = "import_id")
    @JdbcTypeCode(SqlTypes.VARCHAR)
    private UUID importId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        return o instanceof Node other && id != null && id.equals(other.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
