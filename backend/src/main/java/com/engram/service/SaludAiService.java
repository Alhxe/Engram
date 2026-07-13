package com.engram.service;

import com.engram.ai.AiCompletionResult;
import com.engram.ai.AiException;
import com.engram.ai.AiJson;
import com.engram.ai.AiTask;
import com.engram.web.dto.MealIdea;
import com.engram.web.dto.NodeResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * AI over the Salud area, always constrained by the user's "Preferencias de comida"
 * page: suggest dishes, write a full recipe (saved under Recetas), or generate a
 * one-day menu (saved under Comidas). Nothing on the user's ❌/🚫 list is proposed.
 */
@Service
public class SaludAiService {

    private static final int MAX_CHARS = 4000;

    private final AiService aiService;
    private final SaludService saludService;
    private final ObjectMapper mapper;

    public SaludAiService(AiService aiService, SaludService saludService, ObjectMapper mapper) {
        this.aiService = aiService;
        this.saludService = saludService;
        this.mapper = mapper;
    }

    /** 5 dish ideas for a meal (e.g. "cena"), respecting the food preferences. */
    public List<MealIdea> suggestDishes(UUID userId, String meal, String note) {
        String system = """
                Eres un asistente de nutrición para pérdida de grasa. Propón 5 ideas de platos para "%s"
                que RESPETEN ESTRICTAMENTE las preferencias del usuario (nunca uses nada de su lista de NO;
                verdura solo en crema/puré o tomate frito; recetas rápidas). Prioriza proteína alta.
                Responde SOLO con un array JSON: [{"nombre":"...","descripcion":"..."}] en español.
                """.formatted(meal == null || meal.isBlank() ? "una comida" : meal);
        String prompt = preferences() + (note == null || note.isBlank() ? "" : "\n\nNota extra: " + note);
        AiCompletionResult res = aiService.run(userId, AiTask.INGESTION, system, trim(prompt), 900);
        return parseIdeas(res.text());
    }

    /** A full recipe for a dish, saved as a page under Recetas; returns that page. */
    public NodeResponse generateRecipe(UUID userId, String dish) {
        if (dish == null || dish.isBlank()) {
            throw new AiException("Falta el nombre del plato");
        }
        String system = """
                Crea una receta sencilla y RÁPIDA para el plato indicado, respetando ESTRICTAMENTE las
                preferencias del usuario (nada de su lista de NO; verdura solo en crema o tomate frito).
                Apta para déficit calórico, con buena proteína.
                Responde SOLO con JSON: {"titulo":"...","ingredientes":["..."],"pasos":["..."],
                "kcal_aprox":0,"proteina_g":0} en español.
                """;
        String prompt = "Plato: " + dish + "\n\n" + preferences();
        AiCompletionResult res = aiService.run(userId, AiTask.INGESTION, system, trim(prompt), 1200);
        JsonNode j = readJson(res.text());
        String titulo = j.path("titulo").asText(dish).trim();

        StringBuilder html = new StringBuilder();
        html.append("<div class=\"callout\" data-variant=\"info\"><p>~")
                .append(j.path("kcal_aprox").asInt(0)).append(" kcal · ")
                .append(j.path("proteina_g").asInt(0)).append(" g proteína</p></div>");
        html.append("<h2>Ingredientes</h2><ul>");
        for (JsonNode ing : j.path("ingredientes")) {
            html.append("<li>").append(escape(ing.asText())).append("</li>");
        }
        html.append("</ul><h2>Pasos</h2><ol>");
        for (JsonNode step : j.path("pasos")) {
            html.append("<li>").append(escape(step.asText())).append("</li>");
        }
        html.append("</ol>");
        return saludService.createRecipePage(titulo, html.toString());
    }

    /** A one-day menu (~2000 kcal, ~150 g protein) saved under Comidas for the date. */
    public NodeResponse generateMenu(UUID userId, String date) {
        String day = date == null || date.isBlank() ? LocalDate.now().toString() : date;
        String system = """
                Crea un menú de UN día (~2000 kcal, ~150 g de proteína) con desayuno, media mañana, comida,
                merienda y cena. RESPETA ESTRICTAMENTE las preferencias del usuario (nada de su lista de NO;
                verdura solo en crema/puré o tomate frito; huevo solo yema; recetas rápidas/tupper).
                Responde SOLO con JSON: {"desayuno":"...","media_manana":"...","comida":"...",
                "merienda":"...","cena":"...","kcal":0,"proteina_g":0} en español.
                """;
        AiCompletionResult res = aiService.run(userId, AiTask.INGESTION, system, trim(preferences()), 1100);
        JsonNode j = readJson(res.text());

        StringBuilder html = new StringBuilder();
        html.append("<div class=\"callout\" data-variant=\"success\"><p>~")
                .append(j.path("kcal").asInt(0)).append(" kcal · ")
                .append(j.path("proteina_g").asInt(0)).append(" g proteína</p></div>");
        appendMeal(html, "Desayuno", j.path("desayuno").asText(""));
        appendMeal(html, "Media mañana", j.path("media_manana").asText(""));
        appendMeal(html, "Comida", j.path("comida").asText(""));
        appendMeal(html, "Merienda", j.path("merienda").asText(""));
        appendMeal(html, "Cena", j.path("cena").asText(""));
        return saludService.saveDayMenu(day, "Menú " + day, html.toString());
    }

    // --- helpers -------------------------------------------------------------

    private String preferences() {
        return "PREFERENCIAS DE COMIDA DEL USUARIO (obligatorio respetar):\n" + saludService.preferencesText();
    }

    private List<MealIdea> parseIdeas(String raw) {
        try {
            JsonNode arr = readJson(raw);
            if (!arr.isArray()) {
                throw new AiException("La IA no devolvió una lista de platos");
            }
            List<MealIdea> out = new ArrayList<>();
            for (JsonNode n : arr) {
                String nombre = n.path("nombre").asText("").trim();
                if (!nombre.isEmpty()) {
                    out.add(new MealIdea(nombre, n.path("descripcion").asText("").trim()));
                }
            }
            if (out.isEmpty()) {
                throw new AiException("La IA no propuso platos válidos");
            }
            return out;
        } catch (AiException e) {
            throw e;
        } catch (Exception e) {
            throw new AiException("No se pudieron leer las ideas de la IA", e);
        }
    }

    private JsonNode readJson(String raw) {
        try {
            return mapper.readTree(AiJson.clean(raw));
        } catch (Exception e) {
            throw new AiException("Respuesta de IA no válida", e);
        }
    }

    private static void appendMeal(StringBuilder html, String label, String text) {
        html.append("<h3>").append(label).append("</h3><p>").append(escape(text)).append("</p>");
    }

    private String trim(String text) {
        return text.length() > MAX_CHARS ? text.substring(0, MAX_CHARS) : text;
    }

    private static String escape(String s) {
        return s == null ? "" : s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
