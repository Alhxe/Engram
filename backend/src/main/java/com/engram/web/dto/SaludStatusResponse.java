package com.engram.web.dto;

/** Summary of the active health plan: where the user is, weigh-in trend and a
 *  data-driven recommendation surfaced next to the "recalculate" button. */
public record SaludStatusResponse(
        boolean exists,
        int semanaActual,
        int semanasTotal,
        Double pesoInicial,
        Double pesoObjetivo,
        Double pesoActual,
        long sesionesHechas,
        long sesionesSaltadas,
        long sesionesPendientes,
        String recomendacion) {
}
