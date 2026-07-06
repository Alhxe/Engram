package com.engram.web;

import com.engram.service.AcademiaService;
import com.engram.web.dto.NodeResponse;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** The Academia study area: list subjects and scaffold new ones. */
@RestController
@RequestMapping("/api/v1/academia")
public class AcademiaController {

    private final AcademiaService academiaService;

    public AcademiaController(AcademiaService academiaService) {
        this.academiaService = academiaService;
    }

    /** Every subject (child of the Academia root). */
    @GetMapping("/subjects")
    public List<NodeResponse> subjects() {
        return academiaService.subjects();
    }

    /** Create a scaffolded subject (Temario/Apuntes/Flashcards/Preguntas). */
    @PostMapping("/subjects")
    public NodeResponse createSubject(@RequestParam(required = false) String name) {
        return academiaService.createSubject(name);
    }
}
