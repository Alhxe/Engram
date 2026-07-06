package com.engram.web;

import com.engram.service.WorkspaceService;
import com.engram.web.dto.NodeResponse;
import com.engram.web.dto.PageRef;
import com.engram.web.dto.TaskItem;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Cross-cutting workspace views: Inbox, Snippets, and open Tasks. */
@RestController
@RequestMapping("/api/v1")
public class WorkspaceController {

    private final WorkspaceService workspaceService;

    public WorkspaceController(WorkspaceService workspaceService) {
        this.workspaceService = workspaceService;
    }

    @GetMapping("/inbox")
    public List<PageRef> inbox() {
        return workspaceService.byTag("inbox");
    }

    @GetMapping("/snippets")
    public List<NodeResponse> snippets() {
        return workspaceService.snippets();
    }

    @GetMapping("/tasks")
    public List<TaskItem> tasks() {
        return workspaceService.openTasks();
    }
}
