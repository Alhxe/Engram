package com.engram.ai;

/** Helpers for coaxing clean JSON out of model text (fences, prose, etc.). */
public final class AiJson {

    private AiJson() {
    }

    /**
     * Strip Markdown code fences and any prose around the JSON, returning the
     * substring from the first brace/bracket to its matching last one.
     */
    public static String clean(String raw) {
        if (raw == null) {
            throw new AiException("Empty AI response");
        }
        String text = raw.trim();
        if (text.startsWith("```")) {
            int firstNewline = text.indexOf('\n');
            if (firstNewline >= 0) {
                text = text.substring(firstNewline + 1);
            }
            if (text.endsWith("```")) {
                text = text.substring(0, text.length() - 3);
            }
            text = text.trim();
        }
        int start = firstIndexOfAny(text, '{', '[');
        int end = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
        if (start < 0 || end < start) {
            throw new AiException("AI response did not contain JSON");
        }
        return text.substring(start, end + 1);
    }

    private static int firstIndexOfAny(String text, char a, char b) {
        int ia = text.indexOf(a);
        int ib = text.indexOf(b);
        if (ia < 0) {
            return ib;
        }
        if (ib < 0) {
            return ia;
        }
        return Math.min(ia, ib);
    }
}
