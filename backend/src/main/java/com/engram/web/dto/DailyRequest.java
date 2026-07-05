package com.engram.web.dto;

import jakarta.validation.constraints.NotBlank;

/** The client's local date (YYYY-MM-DD) for the journal, to avoid server-TZ drift. */
public record DailyRequest(@NotBlank String date) {
}
