package com.engram.service;

import com.engram.model.PropertyType;
import com.engram.web.dto.CreateNodeRequest;
import com.engram.web.dto.NodeResponse;
import com.engram.web.dto.PropertyDto;
import java.util.UUID;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.safety.Safelist;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Web clipper: fetches a URL, extracts its main content, and saves it as a page
 * with the source URL as a property. Cleans the HTML to the tags our editor uses.
 */
@Service
public class ClipService {

    private static final int TIMEOUT_MS = 15_000;

    private final NodeService nodeService;

    public ClipService(NodeService nodeService) {
        this.nodeService = nodeService;
    }

    @Transactional
    public NodeResponse clip(String url, UUID parentId) {
        String normalized = url.trim();
        if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
            normalized = "https://" + normalized;
        }

        Document document;
        try {
            document = Jsoup.connect(normalized)
                    .userAgent("Mozilla/5.0 (compatible; EngramClipper/1.0)")
                    .timeout(TIMEOUT_MS)
                    .followRedirects(true)
                    .get();
        } catch (Exception e) {
            throw new IllegalArgumentException("Could not fetch the page: " + e.getMessage());
        }

        String title = document.title();
        if (title == null || title.isBlank()) {
            title = normalized;
        }

        Element main = firstNonNull(
                document.selectFirst("article"),
                document.selectFirst("main"),
                document.selectFirst("[role=main]"),
                document.body());
        String rawHtml = main != null ? main.html() : "";
        String cleanHtml = Jsoup.clean(rawHtml, normalized, editorSafelist());

        NodeResponse page = nodeService.create(new CreateNodeRequest(
                title.trim(), cleanHtml, null, null, parentId, null));
        nodeService.upsertProperty(page.id(), new PropertyDto("Source", PropertyType.URL, normalized));
        return nodeService.get(page.id());
    }

    private Safelist editorSafelist() {
        return Safelist.relaxed()
                .addTags("figure", "figcaption")
                .removeTags("span", "div", "section", "nav", "footer", "header", "aside", "form", "button");
    }

    private Element firstNonNull(Element... elements) {
        for (Element element : elements) {
            if (element != null) {
                return element;
            }
        }
        return null;
    }
}
