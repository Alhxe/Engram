package com.engram.service;

import com.engram.model.PageLayout;
import com.engram.model.PropertyType;
import com.engram.web.dto.CreateNodeRequest;
import com.engram.web.dto.NodeResponse;
import com.engram.web.dto.PropertyDto;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Imports a CSV into a Table page: the header row defines properties, the first
 * column becomes each row's title, and the rest become typed properties.
 */
@Service
public class CsvImportService {

    private final NodeService nodeService;

    public CsvImportService(NodeService nodeService) {
        this.nodeService = nodeService;
    }

    @Transactional
    public NodeResponse importCsv(byte[] bytes, String filename, String tableTitle, UUID parentId) {
        List<List<String>> rows = parse(new String(bytes, StandardCharsets.UTF_8));
        rows.removeIf(r -> r.stream().allMatch(s -> s == null || s.isBlank()));
        if (rows.size() < 2) {
            throw new IllegalArgumentException("The CSV needs a header row and at least one data row");
        }

        List<String> header = rows.get(0);
        List<List<String>> data = rows.subList(1, rows.size());
        int cols = header.size();

        // Infer a type per column (NUMBER when every non-empty value is numeric).
        PropertyType[] types = new PropertyType[cols];
        for (int c = 1; c < cols; c++) {
            boolean allNumeric = true;
            boolean any = false;
            for (List<String> row : data) {
                String v = c < row.size() ? row.get(c).trim() : "";
                if (v.isEmpty()) {
                    continue;
                }
                any = true;
                if (!v.matches("-?\\d+(\\.\\d+)?")) {
                    allNumeric = false;
                    break;
                }
            }
            types[c] = (any && allNumeric) ? PropertyType.NUMBER : PropertyType.TEXT;
        }

        String title = tableTitle != null && !tableTitle.isBlank()
                ? tableTitle.trim()
                : stripExtension(filename);
        NodeResponse table = nodeService.create(new CreateNodeRequest(
                title, "", null, PageLayout.TABLE, parentId, null));

        for (List<String> row : data) {
            String rowTitle = !row.isEmpty() && !row.get(0).isBlank() ? row.get(0).trim() : "Untitled";
            NodeResponse child = nodeService.create(new CreateNodeRequest(
                    rowTitle, "", null, null, table.id(), null));
            for (int c = 1; c < cols; c++) {
                String name = header.get(c).trim();
                String value = c < row.size() ? row.get(c).trim() : "";
                if (name.isEmpty() || value.isEmpty()) {
                    continue;
                }
                nodeService.upsertProperty(child.id(), new PropertyDto(name, types[c], value));
            }
        }
        return nodeService.get(table.id());
    }

    private String stripExtension(String filename) {
        if (filename == null || filename.isBlank()) {
            return "Imported table";
        }
        int dot = filename.lastIndexOf('.');
        return dot > 0 ? filename.substring(0, dot) : filename;
    }

    /** Minimal RFC-4180-ish CSV parser (handles quoted fields, commas and escaped quotes). */
    private List<List<String>> parse(String text) {
        List<List<String>> rows = new ArrayList<>();
        List<String> row = new ArrayList<>();
        StringBuilder cur = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (inQuotes) {
                if (c == '"') {
                    if (i + 1 < text.length() && text.charAt(i + 1) == '"') {
                        cur.append('"');
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    cur.append(c);
                }
            } else if (c == '"') {
                inQuotes = true;
            } else if (c == ',') {
                row.add(cur.toString());
                cur.setLength(0);
            } else if (c == '\n') {
                row.add(cur.toString());
                cur.setLength(0);
                rows.add(row);
                row = new ArrayList<>();
            } else if (c != '\r') {
                cur.append(c);
            }
        }
        row.add(cur.toString());
        rows.add(row);
        return rows;
    }
}
