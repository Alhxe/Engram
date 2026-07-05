package com.engram;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.engram.model.ApiKey;
import com.engram.model.ApiKeyScope;
import com.engram.repository.ApiKeyRepository;
import com.engram.security.HashUtil;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
class EngramApiIntegrationTest {

    private static final String WRITE_KEY = "test-write-key";
    private static final String READ_KEY = "test-read-key";
    private static final String AUTH = "Authorization";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ApiKeyRepository apiKeyRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        try {
            Path dir = Files.createTempDirectory("engram-test");
            String db = dir.resolve("test.db").toString().replace('\\', '/');
            registry.add("spring.datasource.url",
                    () -> "jdbc:sqlite:" + db + "?foreign_keys=on&journal_mode=WAL&busy_timeout=5000");
            registry.add("engram.attachments.dir", () -> dir.resolve("attachments").toString());
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    @BeforeEach
    void seedKeys() {
        ensureKey(WRITE_KEY, ApiKeyScope.WRITE);
        ensureKey(READ_KEY, ApiKeyScope.READ);
    }

    private void ensureKey(String token, ApiKeyScope scope) {
        String hash = HashUtil.sha256Hex(token);
        if (apiKeyRepository.findByKeyHashAndRevokedFalse(hash).isEmpty()) {
            ApiKey key = new ApiKey();
            key.setName(scope.name().toLowerCase() + "-test");
            key.setKeyHash(hash);
            key.setScope(scope);
            apiKeyRepository.save(key);
        }
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }

    @Test
    void rejectsRequestsWithoutApiKey() throws Exception {
        mockMvc.perform(get("/api/v1/nodes")).andExpect(status().isUnauthorized());
    }

    @Test
    void enforcesWriteScopeForMutations() throws Exception {
        mockMvc.perform(post("/api/v1/nodes")
                        .header(AUTH, bearer(READ_KEY))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"nope\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void createsAndReadsNode() throws Exception {
        String id = createNode("Backend note", "Runs on the server");
        mockMvc.perform(get("/api/v1/nodes/" + id).header(AUTH, bearer(READ_KEY)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Backend note"));
    }

    @Test
    void fullTextSearchFindsNode() throws Exception {
        createNode("Cloudflare Tunnel", "Expose the server via cloudflared");
        mockMvc.perform(post("/api/v1/search")
                        .header(AUTH, bearer(READ_KEY))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"query\":\"cloudflared\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pages.totalElements").value(greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.pages.content[0].snippet").value(org.hamcrest.Matchers.containsString("<mark>")));
    }

    @Test
    void createsMapWithPlacementAndDerivedEdge() throws Exception {
        String a = createNode("A", "first");
        String b = createNode("B", "second");
        // Link A -> B, so a map holding both shows one edge.
        mockMvc.perform(post("/api/v1/links")
                        .header(AUTH, bearer(WRITE_KEY))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sourceId\":\"" + a + "\",\"targetId\":\"" + b + "\"}"))
                .andExpect(status().isCreated());

        String mapId = readId(mockMvc.perform(post("/api/v1/maps")
                        .header(AUTH, bearer(WRITE_KEY))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Map\"}"))
                .andExpect(status().isCreated())
                .andReturn());

        placeNode(mapId, a);
        placeNode(mapId, b);

        mockMvc.perform(get("/api/v1/maps/" + mapId).header(AUTH, bearer(READ_KEY)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.placements.length()").value(2))
                .andExpect(jsonPath("$.edges.length()").value(1));
    }

    @Test
    void uploadsAndDownloadsAttachment() throws Exception {
        String nodeId = createNode("With file", "has attachment");
        MockMultipartFile file = new MockMultipartFile(
                "file", "hello.txt", "text/plain", "hello engram".getBytes());

        String attachmentId = readId(mockMvc.perform(multipart("/api/v1/nodes/" + nodeId + "/attachments")
                        .file(file)
                        .header(AUTH, bearer(WRITE_KEY)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.filename").value("hello.txt"))
                .andReturn());

        mockMvc.perform(get("/api/v1/attachments/" + attachmentId).header(AUTH, bearer(READ_KEY)))
                .andExpect(status().isOk())
                .andExpect(content().string("hello engram"));
    }

    @Test
    void registerLoginAndAccessWithJwt() throws Exception {
        String token = readField(mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"alice\",\"password\":\"password123\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value("alice"))
                .andReturn(), "token");

        mockMvc.perform(get("/api/v1/nodes").header(AUTH, bearer(token)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"alice\",\"password\":\"password123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());
    }

    @Test
    void rejectsBadLogin() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"carol\",\"password\":\"password123\"}"))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"carol\",\"password\":\"wrongpass\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createsApiKeyViaManagementAndUsesIt() throws Exception {
        String jwt = readField(mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"bob\",\"password\":\"password123\"}"))
                .andExpect(status().isCreated())
                .andReturn(), "token");

        String rawKey = objectMapper.readTree(mockMvc.perform(post("/api/v1/api-keys")
                        .header(AUTH, bearer(jwt))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"program\",\"scope\":\"READ\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString())
                .get("key").asText();

        // The raw key authenticates external programs (read scope).
        mockMvc.perform(get("/api/v1/nodes").header(AUTH, bearer(rawKey)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/nodes")
                        .header(AUTH, bearer(rawKey))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"blocked\"}"))
                .andExpect(status().isForbidden());
    }

    private String readField(MvcResult result, String field) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString()).get(field).asText();
    }

    private String createNode(String title, String content) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/nodes")
                        .header(AUTH, bearer(WRITE_KEY))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"" + title + "\",\"content\":\"" + content + "\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        return readId(result);
    }

    private void placeNode(String mapId, String nodeId) throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .put("/api/v1/maps/" + mapId + "/placements")
                        .header(AUTH, bearer(WRITE_KEY))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nodeId\":\"" + nodeId + "\",\"x\":10,\"y\":20}"))
                .andExpect(status().isOk());
    }

    private String readId(MvcResult result) throws Exception {
        JsonNode node = objectMapper.readTree(result.getResponse().getContentAsString());
        return node.get("id").asText();
    }
}
