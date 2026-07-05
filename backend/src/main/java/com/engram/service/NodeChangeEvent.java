package com.engram.service;

import java.util.UUID;

/** Published when a page is created or deleted, so webhooks can react. */
public record NodeChangeEvent(String event, UUID nodeId, String title) {
}
