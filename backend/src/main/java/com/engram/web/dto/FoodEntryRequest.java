package com.engram.web.dto;

/** Log a food item: name + kcal (and optional protein) on a date (default today). */
public record FoodEntryRequest(String fecha, String nombre, Integer kcal, Integer proteina) {
}
