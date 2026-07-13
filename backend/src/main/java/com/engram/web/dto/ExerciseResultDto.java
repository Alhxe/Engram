package com.engram.web.dto;

import java.util.UUID;

/** One exercise's result within a completed strength session: reps achieved on
 *  its hardest set, used to drive progression on the matching "tope" page. */
public record ExerciseResultDto(UUID topeId, Integer reps) {
}
