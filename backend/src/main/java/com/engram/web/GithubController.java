package com.engram.web;

import com.engram.service.GithubService;
import com.engram.web.dto.NodeResponse;
import java.util.UUID;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Import and re-sync public GitHub repositories as pages. */
@RestController
@RequestMapping("/api/v1/github")
public class GithubController {

    private final GithubService githubService;

    public GithubController(GithubService githubService) {
        this.githubService = githubService;
    }

    /** Create a synced page from "owner/name" (or a github URL). */
    @PostMapping("/import")
    public NodeResponse importRepo(@RequestParam String repo) {
        return githubService.importRepo(repo);
    }

    /** Re-pull README + metadata for an existing repo page. */
    @PostMapping("/{id}/sync")
    public NodeResponse sync(@PathVariable UUID id) {
        return githubService.syncRepo(id);
    }
}
