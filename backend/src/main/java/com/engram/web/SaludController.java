package com.engram.web;

import com.engram.security.SecurityUtils;
import com.engram.service.SaludAiService;
import com.engram.service.SaludService;
import com.engram.web.dto.CompleteSessionRequest;
import com.engram.web.dto.DishesRequest;
import com.engram.web.dto.MealIdea;
import com.engram.web.dto.MenuRequest;
import com.engram.web.dto.NodeResponse;
import com.engram.web.dto.NodeTreeItem;
import com.engram.web.dto.RecipeRequest;
import com.engram.web.dto.SaludStatusResponse;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** The Salud fitness area: scaffold, read status/sessions, log sessions and
 *  recalculate the plan from logged performance. */
@RestController
@RequestMapping("/api/v1/salud")
public class SaludController {

    private final SaludService saludService;
    private final SaludAiService saludAiService;

    public SaludController(SaludService saludService, SaludAiService saludAiService) {
        this.saludService = saludService;
        this.saludAiService = saludAiService;
    }

    /** The Salud sub-pages (for the sidebar section). */
    @GetMapping("/tree")
    public List<NodeTreeItem> tree() {
        return saludService.tree();
    }

    /** Create (idempotently) the Salud area and return its status. */
    @PostMapping("/area")
    public SaludStatusResponse createArea() {
        return saludService.createArea();
    }

    /** Whether the area exists yet (drives the nav's empty state). */
    @GetMapping("/exists")
    public Map<String, Boolean> exists() {
        return Map.of("exists", saludService.exists());
    }

    /** Plan summary: week, adherence, weigh-in trend and diet recommendation. */
    @GetMapping("/status")
    public SaludStatusResponse status() {
        return saludService.status();
    }

    /** Today's session(s). */
    @GetMapping("/today")
    public List<NodeResponse> today() {
        return saludService.today();
    }

    /** All sessions of a plan week. */
    @GetMapping("/week/{number}")
    public List<NodeResponse> week(@PathVariable int number) {
        return saludService.week(number);
    }

    /** The strength-progression records (for logging reps per exercise). */
    @GetMapping("/topes")
    public List<NodeResponse> topes() {
        return saludService.topes();
    }

    /** Mark a session done (records results + progresses the involved topes). */
    @PostMapping("/sessions/{id}/complete")
    public NodeResponse complete(@PathVariable UUID id, @RequestBody(required = false) CompleteSessionRequest body) {
        return saludService.completeSession(id, body);
    }

    /** Mark a session skipped. */
    @PostMapping("/sessions/{id}/skip")
    public NodeResponse skip(@PathVariable UUID id) {
        return saludService.skipSession(id);
    }

    /** Regenerate pending weeks from the latest topes + running schedule. */
    @PostMapping("/recalculate")
    public SaludStatusResponse recalculate() {
        return saludService.recalculate();
    }

    /** Advance the plan to the next week (generating it if needed). */
    @PostMapping("/advance-week")
    public SaludStatusResponse advanceWeek() {
        return saludService.advanceWeek();
    }

    /** Jump to a specific plan week (forwards or backwards). */
    @PostMapping("/set-week")
    public SaludStatusResponse setWeek(@RequestParam int week) {
        return saludService.setWeek(week);
    }

    /** Record a weigh-in (kg), replacing any for the same date. */
    @PostMapping("/weigh-in")
    public SaludStatusResponse weighIn(@RequestParam double peso, @RequestParam(required = false) String fecha) {
        return saludService.weighIn(peso, fecha);
    }

    /** Today's generated menu (or null). */
    @GetMapping("/menu/today")
    public NodeResponse todayMenu() {
        return saludService.todayMenu();
    }

    // --- AI (constrained by the food preferences) ---------------------------

    /** Generate a one-day menu with AI and save it under Comidas. */
    @PostMapping("/ai/menu")
    public NodeResponse generateMenu(@RequestBody(required = false) MenuRequest body) {
        return saludAiService.generateMenu(SecurityUtils.requireUserId(), body == null ? null : body.date());
    }

    /** Ask the AI for dish ideas for a meal (respecting preferences). */
    @PostMapping("/ai/dishes")
    public List<MealIdea> dishes(@RequestBody DishesRequest body) {
        return saludAiService.suggestDishes(SecurityUtils.requireUserId(), body.meal(), body.note());
    }

    /** Generate a full recipe for a dish and save it under Recetas. */
    @PostMapping("/ai/recipe")
    public NodeResponse recipe(@RequestBody RecipeRequest body) {
        return saludAiService.generateRecipe(SecurityUtils.requireUserId(), body.dish());
    }
}
