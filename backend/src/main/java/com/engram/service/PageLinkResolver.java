package com.engram.service;

import com.engram.model.Node;
import com.engram.repository.NodeRepository;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

/**
 * Turns the AI's inline page references into real page links. The AI is asked to
 * mark a mention of another page as {@code <a data-mention="Exact Title">text</a>};
 * this rewrites each such anchor into the editor's mention chip
 * ({@code <span data-type="mention" data-id=... class="page-link">}) so the link
 * renders, navigates and shows up in backlinks. References that don't resolve to a
 * real page are unwrapped back to plain text.
 */
@Service
public class PageLinkResolver {

    private static final Pattern MENTION = Pattern.compile(
            "<a\\b[^>]*\\bdata-mention\\s*=\\s*\"([^\"]*)\"[^>]*>(.*?)</a>",
            Pattern.CASE_INSENSITIVE | Pattern.DOTALL);

    private final NodeRepository nodeRepository;

    public PageLinkResolver(NodeRepository nodeRepository) {
        this.nodeRepository = nodeRepository;
    }

    /** The rewritten HTML plus the ids of every page it now links to. */
    public record Resolved(String html, Set<UUID> targetIds) {
    }

    /**
     * @param html       content that may contain {@code <a data-mention="…">} anchors
     * @param localTitles pages created in the same batch (title lowercased → id), resolved
     *                    before hitting the database so within-batch links work
     */
    public Resolved resolve(String html, Map<String, UUID> localTitles) {
        Set<UUID> targets = new LinkedHashSet<>();
        if (html == null || html.isBlank()) {
            return new Resolved(html == null ? "" : html, targets);
        }
        Matcher matcher = MENTION.matcher(html);
        StringBuilder out = new StringBuilder();
        while (matcher.find()) {
            String rawTitle = unescapeHtml(matcher.group(1).trim());
            String inner = matcher.group(2);
            UUID targetId = resolveTitle(rawTitle, localTitles);
            if (targetId != null) {
                Node target = nodeRepository.findById(targetId).orElse(null);
                String label = target != null ? target.getTitle() : rawTitle;
                targets.add(targetId);
                matcher.appendReplacement(out, Matcher.quoteReplacement(mentionSpan(targetId, label)));
            } else {
                // Unknown page: drop the wrapper, keep whatever text the AI wrote.
                matcher.appendReplacement(out, Matcher.quoteReplacement(inner));
            }
        }
        matcher.appendTail(out);
        return new Resolved(out.toString(), targets);
    }

    private UUID resolveTitle(String title, Map<String, UUID> localTitles) {
        if (title == null || title.isBlank()) {
            return null;
        }
        UUID local = localTitles.get(title.toLowerCase());
        if (local != null) {
            return local;
        }
        return nodeRepository.findByTitleIgnoreCaseAndDeletedAtIsNull(title).stream()
                .findFirst().map(Node::getId).orElse(null);
    }

    private static String mentionSpan(UUID id, String label) {
        return "<span data-type=\"mention\" class=\"page-link\" data-id=\"" + id
                + "\" data-label=\"" + escapeAttr(label) + "\">" + escapeHtml(label) + "</span>";
    }

    private static String escapeHtml(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    private static String escapeAttr(String s) {
        return escapeHtml(s).replace("\"", "&quot;");
    }

    private static String unescapeHtml(String s) {
        return s.replace("&quot;", "\"").replace("&#39;", "'")
                .replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&");
    }
}
