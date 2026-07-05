package com.engram.web;

import com.engram.service.CalendarService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * iCalendar feed of all dated pages. Subscribe from a calendar app using the
 * URL with an API key: /api/v1/calendar.ics?key=engram_...
 */
@RestController
public class CalendarController {

    private final CalendarService calendarService;

    public CalendarController(CalendarService calendarService) {
        this.calendarService = calendarService;
    }

    @GetMapping(value = "/api/v1/calendar.ics", produces = "text/calendar")
    public ResponseEntity<String> feed() {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/calendar; charset=utf-8"))
                .body(calendarService.feed());
    }
}
