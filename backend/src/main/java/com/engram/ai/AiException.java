package com.engram.ai;

/** Raised when an AI call fails (bad key, provider error, not configured). */
public class AiException extends RuntimeException {

    public AiException(String message) {
        super(message);
    }

    public AiException(String message, Throwable cause) {
        super(message, cause);
    }
}
