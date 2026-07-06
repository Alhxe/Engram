package com.engram.service;

import com.engram.model.PropertyType;
import com.engram.repository.NodePropertyRepository;
import com.engram.repository.NodeRepository;
import com.engram.web.dto.CreateNodeRequest;
import com.engram.web.dto.NodeResponse;
import com.engram.web.dto.PropertyDto;
import com.engram.web.dto.UpdateNodeRequest;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Turns a public GitHub repo into a synced page: its README becomes the page
 * content and metadata (stars, language, last push) become typed properties.
 * The page is just a normal node tagged {@code github} with a "Repo" property
 * (owner/name), so it links into the graph like anything else and re-syncs on a
 * schedule. Unauthenticated GitHub API allows 60 req/h; set
 * {@code engram.github.token} to raise that.
 */
@Service
public class GithubService {

    private static final Logger log = LoggerFactory.getLogger(GithubService.class);
    static final String TAG = "github";

    private final NodeService nodeService;
    private final NodeRepository nodeRepository;
    private final NodePropertyRepository propertyRepository;
    private final ObjectMapper mapper;
    private final String token;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    public GithubService(NodeService nodeService,
                         NodeRepository nodeRepository,
                         NodePropertyRepository propertyRepository,
                         ObjectMapper mapper,
                         @Value("${engram.github.token:}") String token) {
        this.nodeService = nodeService;
        this.nodeRepository = nodeRepository;
        this.propertyRepository = propertyRepository;
        this.mapper = mapper;
        this.token = token;
    }

    /** Create a page for a public repo ("owner/name" or a github URL) and sync it. */
    @Transactional
    public NodeResponse importRepo(String repoInput) {
        String slug = parseSlug(repoInput);
        String name = slug.substring(slug.indexOf('/') + 1);
        NodeResponse page = nodeService.create(
                new CreateNodeRequest(name, "", null, null, null, List.of(TAG)));
        nodeService.upsertProperty(page.id(), new PropertyDto("Repo", PropertyType.TEXT, slug));
        return syncRepo(page.id());
    }

    /** Refresh a repo page's README + metadata from the GitHub API. */
    @Transactional
    public NodeResponse syncRepo(UUID id) {
        String slug = propertyRepository.findByNodeIdAndName(id, "Repo").map(p -> p.getValue()).orElse(null);
        if (slug == null || slug.isBlank()) {
            throw new IllegalArgumentException("Page has no \"Repo\" (owner/name) property");
        }
        JsonNode repo = getJson("https://api.github.com/repos/" + slug);
        String readmeHtml = getReadmeHtml(slug);

        String fullName = text(repo, "full_name", slug);
        String description = text(repo, "description", "");
        long stars = repo.path("stargazers_count").asLong(0);
        String language = text(repo, "language", "");
        String htmlUrl = text(repo, "html_url", "https://github.com/" + slug);
        String pushedAt = text(repo, "pushed_at", "");
        String pushedDate = pushedAt.length() >= 10 ? pushedAt.substring(0, 10) : "";

        String content = buildContent(fullName, description, stars, language, pushedDate, htmlUrl, readmeHtml);

        NodeResponse node = nodeService.get(id);
        nodeService.update(id, new UpdateNodeRequest(
                node.title(), content, node.kind(), node.layout(), node.parentId(), node.tags()));

        nodeService.upsertProperty(id, new PropertyDto("Repo", PropertyType.TEXT, slug));
        nodeService.upsertProperty(id, new PropertyDto("URL", PropertyType.URL, htmlUrl));
        nodeService.upsertProperty(id, new PropertyDto("Estrellas", PropertyType.NUMBER, String.valueOf(stars)));
        if (!language.isBlank()) {
            nodeService.upsertProperty(id, new PropertyDto("Lenguaje", PropertyType.TEXT, language));
        }
        if (!pushedDate.isBlank()) {
            nodeService.upsertProperty(id, new PropertyDto("Último commit", PropertyType.DATE, pushedDate));
        }
        return nodeService.get(id);
    }

    /** Refresh every repo page (scheduled). Returns how many synced OK. */
    @Transactional
    public int syncAll() {
        int ok = 0;
        for (var n : nodeRepository.findByTagName(TAG)) {
            try {
                syncRepo(n.getId());
                ok++;
            } catch (Exception e) {
                log.warn("GitHub sync failed for {}: {}", n.getId(), e.getMessage());
            }
        }
        return ok;
    }

    private String buildContent(String fullName, String description, long stars, String language,
                                String pushedDate, String htmlUrl, String readmeHtml) {
        StringBuilder stats = new StringBuilder("⭐ ").append(stars);
        if (!language.isBlank()) {
            stats.append(" · ").append(escape(language));
        }
        if (!pushedDate.isBlank()) {
            stats.append(" · ").append(pushedDate);
        }
        StringBuilder sb = new StringBuilder();
        sb.append("<div class=\"callout\" data-variant=\"info\"><p><strong>").append(escape(fullName)).append("</strong>");
        if (!description.isBlank()) {
            sb.append(" — ").append(escape(description));
        }
        sb.append("</p><p>").append(stats).append(" · <a href=\"").append(escape(htmlUrl))
                .append("\">GitHub</a></p></div>");
        if (readmeHtml != null && !readmeHtml.isBlank()) {
            sb.append(readmeHtml);
        }
        return sb.toString();
    }

    private JsonNode getJson(String url) {
        HttpResponse<String> res = send(url, "application/vnd.github+json");
        if (res.statusCode() == 404) {
            throw new IllegalArgumentException("Repo not found (is it public?): " + url);
        }
        if (res.statusCode() >= 300) {
            throw new IllegalStateException("GitHub API returned " + res.statusCode());
        }
        try {
            return mapper.readTree(res.body());
        } catch (IOException e) {
            throw new IllegalStateException("Unreadable GitHub response", e);
        }
    }

    private String getReadmeHtml(String slug) {
        try {
            HttpResponse<String> res = send(
                    "https://api.github.com/repos/" + slug + "/readme", "application/vnd.github.html");
            return res.statusCode() == 200 ? res.body() : null;
        } catch (Exception e) {
            return null; // no README, or transient — metadata sync still succeeds
        }
    }

    private HttpResponse<String> send(String url, String accept) {
        try {
            HttpRequest.Builder b = HttpRequest.newBuilder(URI.create(url))
                    .header("Accept", accept)
                    .header("User-Agent", "Engram")
                    .timeout(Duration.ofSeconds(15))
                    .GET();
            if (token != null && !token.isBlank()) {
                b.header("Authorization", "Bearer " + token);
            }
            return http.send(b.build(), HttpResponse.BodyHandlers.ofString());
        } catch (IOException e) {
            throw new IllegalStateException("GitHub request failed: " + e.getMessage(), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("GitHub request interrupted", e);
        }
    }

    /** Normalise "owner/name", "https://github.com/owner/name", "...name.git" → "owner/name". */
    private static String parseSlug(String input) {
        if (input == null) {
            throw new IllegalArgumentException("A repo is required");
        }
        String s = input.trim()
                .replaceFirst("^https?://github\\.com/", "")
                .replaceFirst("\\.git$", "")
                .replaceAll("/+$", "");
        if (!s.matches("[^/\\s]+/[^/\\s]+")) {
            throw new IllegalArgumentException("Expected owner/name, got: " + input);
        }
        return s;
    }

    private static String text(JsonNode node, String field, String fallback) {
        JsonNode v = node.get(field);
        return v == null || v.isNull() ? fallback : v.asText(fallback);
    }

    private static String escape(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
