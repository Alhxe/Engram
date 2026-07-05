package com.engram.web.dto;

import java.util.List;

/** The one-hop neighborhood of a page: the page, its neighbors, and the links. */
public record LocalGraphResponse(List<GraphNodeDto> nodes, List<GraphEdgeDto> edges) {
}
