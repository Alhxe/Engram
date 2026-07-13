package com.engram.web.dto;

/** Create or edit a training session from the panel. All fields optional on edit;
 *  on create, tipo defaults to "Descanso" and fecha to today. */
public record SessionRequest(String fecha, String tipo, String objetivo, String estado) {
}
