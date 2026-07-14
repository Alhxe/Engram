package com.engram.web.dto;

import java.util.List;

/** A day's food diary: running totals vs targets and the individual entries. */
public record FoodDaySummary(
        String date,
        int targetKcal,
        int totalKcal,
        int targetProtein,
        int totalProtein,
        List<FoodEntry> entries) {
}
