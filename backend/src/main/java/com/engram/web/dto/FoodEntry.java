package com.engram.web.dto;

/** One logged food item in the daily diary. */
public record FoodEntry(String id, String nombre, int kcal, int proteina) {
}
