package com.engram.web.dto;

/** How many sub-pages an AI bulk-fill wrote a value to, out of how many were considered. */
public record FillResult(int filled, int total) {
}
