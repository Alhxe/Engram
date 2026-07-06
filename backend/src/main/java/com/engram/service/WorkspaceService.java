package com.engram.service;

import com.engram.model.Node;
import com.engram.repository.NodeRepository;
import com.engram.web.dto.NodeResponse;
import com.engram.web.dto.PageRef;
import com.engram.web.dto.TaskItem;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Cross-cutting workspace views over the substrate: the Inbox (unfiled captures),
 * the snippet library, and every open to-do scattered across pages — all derived
 * from existing pages/tags/content, no new model.
 */
@Service
public class WorkspaceService {

    static final String INBOX_TAG = "inbox";
    static final String SNIPPET_TAG = "snippet";
    private static final int MAX_SCAN = 500;

    // TipTap task items: <li ... data-type="taskItem" ... data-checked="true|false">…</li>
    private static final Pattern TASK_ITEM = Pattern.compile(
            "<li[^>]*data-type=\"taskItem\"[^>]*data-checked=\"(true|false)\"[^>]*>(.*?)</li>",
            Pattern.DOTALL | Pattern.CASE_INSENSITIVE);

    private final NodeRepository nodeRepository;
    private final NodeService nodeService;

    public WorkspaceService(NodeRepository nodeRepository, NodeService nodeService) {
        this.nodeRepository = nodeRepository;
        this.nodeService = nodeService;
    }

    /** Live pages carrying a tag, newest first (used for Inbox). */
    @Transactional(readOnly = true)
    public List<PageRef> byTag(String tag) {
        return nodeRepository.findByTagName(tag).stream()
                .filter(n -> n.getTitle() != null && !n.getTitle().isBlank())
                .sorted(Comparator.comparing(Node::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(n -> new PageRef(n.getId(), n.getTitle(), n.getLayout()))
                .toList();
    }

    /** Snippet pages with their content (for copy + preview). */
    @Transactional(readOnly = true)
    public List<NodeResponse> snippets() {
        return nodeRepository.findByTagName(SNIPPET_TAG).stream()
                .map(n -> nodeService.get(n.getId()))
                .toList();
    }

    /** Every unchecked to-do across all pages, with a link back to its page. */
    @Transactional(readOnly = true)
    public List<TaskItem> openTasks() {
        List<Node> pages = nodeRepository
                .findByDeletedAtIsNull(PageRequest.of(0, MAX_SCAN, Sort.by(Sort.Order.desc("updatedAt"))))
                .getContent();
        List<TaskItem> out = new ArrayList<>();
        for (Node page : pages) {
            String content = page.getContent();
            if (content == null || !content.contains("taskItem")) {
                continue;
            }
            Matcher m = TASK_ITEM.matcher(content);
            while (m.find()) {
                if ("true".equalsIgnoreCase(m.group(1))) {
                    continue; // only open items
                }
                String text = strip(m.group(2));
                if (!text.isBlank()) {
                    out.add(new TaskItem(page.getId(), page.getTitle(), text, false));
                }
            }
        }
        return out;
    }

    private static String strip(String html) {
        return html
                .replaceAll("<[^>]+>", " ")
                .replace("&nbsp;", " ")
                .replace("&amp;", "&")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replaceAll("\\s+", " ")
                .trim();
    }
}
