package com.engram.model;

import com.engram.ai.AiProviderType;
import com.engram.ai.AiTask;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Which provider + model handles a given AI task for a user. */
@Entity
@Table(name = "ai_task_model")
@Getter
@Setter
@NoArgsConstructor
public class AiTaskModel {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(columnDefinition = "text")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AiTask task;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AiProviderType provider;

    @Column(nullable = false)
    private String model;

    @Column(nullable = false)
    private boolean enabled = true;
}
