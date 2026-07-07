package com.engram.web.dto;

import java.util.List;

/** One multiple-choice exam question: the stem, its options, the index of the
 *  correct option (0-based) and a one-line explanation. */
public record ExamQuestion(String question, List<String> options, int answer, String explanation) {
}
