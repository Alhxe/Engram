package com.engram.web;

import com.engram.service.NodeService;
import com.engram.web.dto.PublicPageResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Unauthenticated read-only access to pages shared via a token. */
@RestController
@RequestMapping("/api/v1/public")
public class PublicController {

    private final NodeService nodeService;

    public PublicController(NodeService nodeService) {
        this.nodeService = nodeService;
    }

    @GetMapping("/{token}")
    public PublicPageResponse page(@PathVariable String token) {
        return nodeService.publicPage(token);
    }
}
