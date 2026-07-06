package com.engram.service;

import com.engram.model.Node;
import com.engram.model.PageLayout;
import com.engram.repository.NodeRepository;
import com.engram.web.dto.CreateNodeRequest;
import com.engram.web.dto.NodeResponse;
import com.engram.web.dto.SmartQuery;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The "Academia" area: a dedicated study space living on the same substrate. A
 * single root page "Academia" holds one child per subject; creating a subject
 * scaffolds its Temario (a learning-path), Apuntes, Flashcards and an
 * open-Questions smart collection — so the user just fills them in.
 */
@Service
public class AcademiaService {

    static final String ROOT = "Academia";
    static final String SUBJECT_TAG = "asignatura";

    private final NodeService nodeService;
    private final NodeRepository nodeRepository;

    public AcademiaService(NodeService nodeService, NodeRepository nodeRepository) {
        this.nodeService = nodeService;
        this.nodeRepository = nodeRepository;
    }

    /** Subjects = children of the Academia root (empty if none created yet). */
    @Transactional(readOnly = true)
    public List<NodeResponse> subjects() {
        return findRoot()
                .map(root -> nodeRepository.findByParentIdAndDeletedAtIsNullOrderByTitleAsc(root.getId()).stream()
                        .map(n -> nodeService.get(n.getId()))
                        .toList())
                .orElseGet(List::of);
    }

    /** Create a subject under Academia, scaffolded with its standard sections. */
    @Transactional
    public NodeResponse createSubject(String name) {
        String title = name == null || name.isBlank() ? "Nueva asignatura" : name.trim();
        Node root = getOrCreateRoot();

        NodeResponse subject = nodeService.create(new CreateNodeRequest(
                title,
                "<p>Asignatura. Abajo: <strong>Temario</strong> (ruta con progreso), <strong>Apuntes</strong>, "
                        + "<strong>Flashcards</strong> y <strong>Preguntas</strong> abiertas.</p>",
                null, null, root.getId(), List.of(SUBJECT_TAG)));
        UUID sid = subject.id();

        nodeService.create(new CreateNodeRequest("Temario",
                "<p>Ruta del curso. Cada tema es un paso; márcalos hechos y verás la barra de progreso. "
                        + "Genera flashcards con IA desde cada tema.</p>",
                null, null, sid, List.of("ruta")));
        nodeService.create(new CreateNodeRequest("Apuntes",
                "<p>Notas de clase por concepto.</p>", null, null, sid, List.of()));
        nodeService.create(new CreateNodeRequest("Flashcards",
                "<p>Tarjetas para repaso espaciado. Genera con IA desde un tema, o crea a mano con el tag "
                        + "<code>flashcard</code> (título = pregunta, contenido = respuesta).</p>",
                null, null, sid, List.of()));
        NodeResponse preguntas = nodeService.create(new CreateNodeRequest("Preguntas",
                "<p>Dudas abiertas del curso. Se resuelven enlazando a la nota que las responde.</p>",
                null, null, sid, List.of()));
        nodeService.setSmartQuery(preguntas.id(), new SmartQuery(List.of("pregunta"), "Estado", "Abierta"));

        return nodeService.get(sid);
    }

    private java.util.Optional<Node> findRoot() {
        return nodeRepository.findByTitleIgnoreCaseAndDeletedAtIsNull(ROOT).stream()
                .filter(n -> n.getParent() == null)
                .findFirst();
    }

    private Node getOrCreateRoot() {
        return findRoot().orElseGet(() -> {
            Node created = new Node();
            created.setTitle(ROOT);
            created.setLayout(PageLayout.DOCUMENT);
            return nodeRepository.saveAndFlush(created);
        });
    }
}
