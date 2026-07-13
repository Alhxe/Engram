package com.engram.web.dto;

import java.util.List;

/** Payload for marking a training session done: how long / how hard it felt, an
 *  optional note, and (for strength days) the reps hit per exercise. */
public record CompleteSessionRequest(
        Integer durationMin,
        Integer rpe,
        String notes,
        List<ExerciseResultDto> exercises) {
}
