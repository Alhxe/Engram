package com.engram.web.dto;

/** Ask the AI to generate a one-day menu; date is optional (defaults to today). */
public record MenuRequest(String date) {
}
