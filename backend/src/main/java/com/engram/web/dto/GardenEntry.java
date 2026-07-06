package com.engram.web.dto;

/** One publicly shared page in the digital garden index (token + title). */
public record GardenEntry(String token, String title) {
}
