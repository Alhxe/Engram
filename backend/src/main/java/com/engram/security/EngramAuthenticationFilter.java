package com.engram.security;

import com.engram.model.ApiKey;
import com.engram.model.ApiKeyScope;
import com.engram.repository.ApiKeyRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Authenticates every request by either a user JWT (the web app) or an API key
 * (external programs). Tokens containing a '.' are treated as JWTs; otherwise
 * the token is looked up as an API key. Authorities are SCOPE_READ / SCOPE_WRITE
 * so downstream authorization can distinguish reads from mutations.
 */
@Component
public class EngramAuthenticationFilter extends OncePerRequestFilter {

    private static final GrantedAuthority READ = new SimpleGrantedAuthority("SCOPE_READ");
    private static final GrantedAuthority WRITE = new SimpleGrantedAuthority("SCOPE_WRITE");

    private final JwtService jwtService;
    private final ApiKeyRepository apiKeyRepository;

    public EngramAuthenticationFilter(JwtService jwtService, ApiKeyRepository apiKeyRepository) {
        this.jwtService = jwtService;
        this.apiKeyRepository = apiKeyRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        String token = extractToken(request);
        if (token != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            if (token.contains(".")) {
                authenticateJwt(token);
            } else {
                authenticateApiKey(token);
            }
        }
        chain.doFilter(request, response);
    }

    private void authenticateJwt(String token) {
        try {
            UserPrincipal principal = jwtService.parse(token);
            setAuthentication(principal, List.of(READ, WRITE));
        } catch (Exception ignored) {
            // invalid/expired token -> stays unauthenticated
        }
    }

    private void authenticateApiKey(String token) {
        Optional<ApiKey> match = apiKeyRepository.findActiveWithUser(HashUtil.sha256Hex(token));
        if (match.isEmpty()) {
            return;
        }
        ApiKey key = match.get();
        if (key.getExpiresAt() != null && key.getExpiresAt().isBefore(Instant.now())) {
            return;
        }
        List<GrantedAuthority> authorities = key.getScope() == ApiKeyScope.WRITE
                ? List.of(READ, WRITE)
                : List.of(READ);
        UserPrincipal principal = key.getUser() != null
                ? new UserPrincipal(key.getUser().getId(), key.getUser().getUsername())
                : new UserPrincipal(null, "api-key");
        setAuthentication(principal, authorities);
    }

    private void setAuthentication(UserPrincipal principal, List<GrantedAuthority> authorities) {
        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(principal, null, authorities);
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    private String extractToken(HttpServletRequest request) {
        String authorization = request.getHeader("Authorization");
        if (authorization != null && authorization.startsWith("Bearer ")) {
            return authorization.substring("Bearer ".length()).trim();
        }
        String apiKeyHeader = request.getHeader("X-API-Key");
        if (apiKeyHeader != null && !apiKeyHeader.isBlank()) {
            return apiKeyHeader.trim();
        }
        // Query-param key, for clients that can't set headers (e.g. calendar feed URLs).
        String keyParam = request.getParameter("key");
        return (keyParam != null && !keyParam.isBlank()) ? keyParam.trim() : null;
    }
}
