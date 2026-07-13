package com.engram.web.dto;

/** Ask the AI for dish ideas for a given meal (e.g. "cena"), with an optional note. */
public record DishesRequest(String meal, String note) {
}
