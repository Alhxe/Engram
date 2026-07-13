package com.engram.web.dto;

/** Ask the AI for a full recipe for a named dish (saved as a page under Recetas). */
public record RecipeRequest(String dish) {
}
