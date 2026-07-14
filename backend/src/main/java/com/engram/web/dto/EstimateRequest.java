package com.engram.web.dto;

/** Ask the AI to estimate kcal/protein for a dish description. */
public record EstimateRequest(String dish) {
}
