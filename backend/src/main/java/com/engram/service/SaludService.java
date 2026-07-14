package com.engram.service;

import com.engram.model.Node;
import com.engram.model.PageLayout;
import com.engram.model.PropertyType;
import com.engram.repository.NodePropertyRepository;
import com.engram.repository.NodeRepository;
import com.engram.web.dto.CompleteSessionRequest;
import com.engram.web.dto.CreateNodeRequest;
import com.engram.web.dto.ExerciseResultDto;
import com.engram.web.dto.FoodDaySummary;
import com.engram.web.dto.FoodEntry;
import com.engram.web.dto.NodeResponse;
import com.engram.web.dto.NodeTreeItem;
import com.engram.web.dto.PropertyDto;
import com.engram.web.dto.SaludStatusResponse;
import com.engram.web.dto.SchemaField;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The "Salud" area: a fitness/nutrition space on the same node substrate, mirroring
 * Academia. A single root page "Salud" holds the plan config, an "Ejercicios" table
 * of strength-progression records ("topes"), a "Sesiones" table of dated workouts,
 * and a "Peso" chart. All state lives in ordinary typed properties.
 *
 * <p>The engine reacts to logged performance: completing a strength session bumps the
 * matching exercise's target reps / progression level; recalculating regenerates the
 * upcoming (still-pending) weeks from the latest topes and the running schedule, and
 * derives a diet recommendation from the weigh-in trend.
 */
@Service
public class SaludService {

    static final String ROOT = "Salud";
    static final String AREA_TAG = "salud";
    static final String SESSION_TAG = "entreno";
    static final String TOPE_TAG = "tope";

    // Structural children (found/created by title under the root).
    static final String PLAN = "Plan activo";
    static final String EJERCICIOS = "Ejercicios";
    static final String SESIONES = "Sesiones";
    static final String PESO = "Peso";
    static final String COMIDAS = "Comidas";
    static final String RECETAS = "Recetas";
    static final String DIET_DAY_TAG = "dieta-dia";
    static final String RECIPE_TAG = "receta";
    static final String REGISTRO = "Registro comidas";
    static final String FOOD_TAG = "comida-log";
    static final String F_NOMBRE = "nombre";
    static final String F_KCAL = "kcal";
    static final String F_PROT = "proteina";
    static final String P_KCAL = "kcal_objetivo";
    static final String P_PROT = "proteina_objetivo";

    // Plan config properties.
    static final String P_PESO_INI = "peso_inicial";
    static final String P_PESO_OBJ = "peso_objetivo";
    static final String P_FECHA_INICIO = "fecha_inicio";
    static final String P_DIAS = "dias_semana";
    static final String P_SEMANA = "semana_actual";
    static final String P_SEMANAS_TOTAL = "semanas_total";

    // Session properties.
    static final String S_FECHA = "fecha";
    static final String S_SEMANA = "semana";
    static final String S_TIPO = "tipo";
    static final String S_ESTADO = "estado";
    static final String S_OBJETIVO = "objetivo";
    static final String S_RESULTADO = "resultado";
    static final String S_RPE = "rpe";
    static final String S_DURACION = "duracion_min";

    static final String EST_PENDIENTE = "Pendiente";
    static final String EST_HECHO = "Hecho";
    static final String EST_SALTADO = "Saltado";

    // Tope (strength progression) properties.
    static final String T_NIVEL = "nivel";
    static final String T_REPS_OBJ = "reps_objetivo";
    static final String T_MEJOR = "mejor_reps";
    static final String T_SESIONES_TOPE = "sesiones_tope";
    static final String T_PATRON = "patron";

    private static final int REP_TOP = 15;     // top of the hypertrophy range
    private static final int REP_BOTTOM = 8;    // reset here after leveling up

    /** Progression ladders per movement (easiest → hardest). */
    private static final Map<String, List<String>> LADDERS = new LinkedHashMap<>();

    static {
        LADDERS.put("Flexiones", List.of("Rodillas", "Normales", "Declinadas", "Diamante", "Arqueras"));
        LADDERS.put("Fondos", List.of("Banco", "Paralelas", "Lastradas"));
        LADDERS.put("Pica push-up", List.of("Pica", "HSPU pared asistido", "HSPU pared"));
        LADDERS.put("Dominadas", List.of("Remo australiano", "Negativas", "Con banda", "Estrictas", "Lastradas"));
        LADDERS.put("Remo australiano", List.of("Pies en suelo", "Pies elevados", "Arqueras"));
        LADDERS.put("Sentadilla", List.of("Normal", "Búlgara", "Pistol asistida", "Pistol"));
        LADDERS.put("Hip thrust", List.of("Dos piernas", "Una pierna", "Una pierna elevada"));
        LADDERS.put("Core", List.of("Plancha", "Hollow hold", "Colgado rodillas", "Colgado piernas"));
    }

    private static final List<String> DAY_A = List.of("Flexiones", "Fondos", "Pica push-up", "Core");
    private static final List<String> DAY_B = List.of("Dominadas", "Remo australiano", "Sentadilla", "Hip thrust");
    private static final List<String> DAY_C = List.of("Flexiones", "Dominadas", "Sentadilla", "Core");

    // Running progression, indexed by (week - 1), clamped to the last row.
    private static final int[] RUN_Z2 = {25, 28, 32, 25, 35, 38, 30, 40};
    private static final String[] RUN_INT = {
        "6×(1' fuerte / 2' andar)", "8×(1' / 2')", "5×(2' / 2')", "4×(2' / 2') · descarga",
        "5×(3' / 2')", "Tempo 2×8'", "Test 5k a ritmo", "Tempo 2×10'"
    };
    private static final int[] RUN_LONG = {25, 30, 35, 30, 40, 45, 40, 50};
    private static final String[] SETS = {"3", "3-4", "4", "2-3", "4", "4", "3", "4"};

    private final NodeService nodeService;
    private final NodeRepository nodeRepository;
    private final NodePropertyRepository propertyRepository;

    public SaludService(NodeService nodeService,
                        NodeRepository nodeRepository,
                        NodePropertyRepository propertyRepository) {
        this.nodeService = nodeService;
        this.nodeRepository = nodeRepository;
        this.propertyRepository = propertyRepository;
    }

    // --- Scaffolding ---------------------------------------------------------

    /** Create the Salud area (idempotent): plan config, Ejercicios, Sesiones, Peso;
     *  seed the exercise topes and generate week 1 if there are no sessions yet. */
    @Transactional
    public SaludStatusResponse createArea() {
        Node root = getOrCreateRoot();

        Node plan = childByTitle(root, PLAN).orElseGet(() ->
                requireNode(nodeService.create(new CreateNodeRequest(PLAN,
                        "<p>Configuración del plan activo. Edita las propiedades para reajustar objetivo y ritmo.</p>",
                        null, PageLayout.DOCUMENT, root.getId(), List.of(AREA_TAG))).id()));
        seedPlanDefaults(plan.getId());

        Node ejercicios = childByTitle(root, EJERCICIOS).orElseGet(() -> {
            Node created = requireNode(nodeService.create(new CreateNodeRequest(EJERCICIOS,
                    "<p>Progresión de fuerza. Cada fila es un patrón; su nivel y reps objetivo suben solos al registrar sesiones.</p>",
                    null, PageLayout.TABLE, root.getId(), List.of(AREA_TAG))).id());
            nodeService.setSchema(created.getId(), List.of(
                    new SchemaField(T_PATRON, PropertyType.SELECT, List.of("Empuje", "Tirón", "Pierna", "Core")),
                    new SchemaField(T_NIVEL, PropertyType.NUMBER, null),
                    new SchemaField(T_REPS_OBJ, PropertyType.NUMBER, null),
                    new SchemaField(T_MEJOR, PropertyType.NUMBER, null),
                    new SchemaField(T_SESIONES_TOPE, PropertyType.NUMBER, null)));
            return created;
        });
        seedTopes(ejercicios);

        Node sesiones = childByTitle(root, SESIONES).orElseGet(() -> {
            Node created = requireNode(nodeService.create(new CreateNodeRequest(SESIONES,
                    "<p>Sesiones de entreno, una por día. Márcalas Hecho/Saltado; el plan se reajusta a partir de ahí.</p>",
                    null, PageLayout.TABLE, root.getId(), List.of(AREA_TAG))).id());
            nodeService.setSchema(created.getId(), List.of(
                    new SchemaField(S_FECHA, PropertyType.DATE, null),
                    new SchemaField(S_SEMANA, PropertyType.NUMBER, null),
                    new SchemaField(S_TIPO, PropertyType.SELECT, List.of(
                            "Calistenia A", "Calistenia B", "Calistenia C",
                            "Carrera Z2", "Carrera intervalos", "Carrera larga", "Descanso")),
                    new SchemaField(S_ESTADO, PropertyType.SELECT, List.of(EST_PENDIENTE, EST_HECHO, EST_SALTADO)),
                    new SchemaField(S_OBJETIVO, PropertyType.TEXT, null),
                    new SchemaField(S_RESULTADO, PropertyType.TEXT, null),
                    new SchemaField(S_RPE, PropertyType.RATING, null),
                    new SchemaField(S_DURACION, PropertyType.NUMBER, null)));
            return created;
        });

        Node peso = childByTitle(root, PESO).orElseGet(() -> {
            Node created = requireNode(nodeService.create(new CreateNodeRequest(PESO,
                    "<p>Pesaje semanal (lunes en ayunas). La gráfica traza la tendencia.</p>",
                    null, PageLayout.CHART, root.getId(), List.of(AREA_TAG))).id());
            nodeService.setSchema(created.getId(), List.of(
                    new SchemaField(S_FECHA, PropertyType.DATE, null),
                    new SchemaField("peso", PropertyType.NUMBER, null)));
            return created;
        });

        childByTitle(root, COMIDAS).orElseGet(() -> {
            Node created = requireNode(nodeService.create(new CreateNodeRequest(COMIDAS,
                    "<p>Menú por día, generado con IA respetando tus preferencias. Pide uno nuevo desde el panel.</p>",
                    null, PageLayout.CALENDAR, root.getId(), List.of(AREA_TAG))).id());
            nodeService.setSchema(created.getId(), List.of(
                    new SchemaField(S_FECHA, PropertyType.DATE, null),
                    new SchemaField("kcal", PropertyType.NUMBER, null)));
            return created;
        });

        childByTitle(root, RECETAS).orElseGet(() -> requireNode(nodeService.create(new CreateNodeRequest(RECETAS,
                "<p>Recetas guardadas (generadas con IA o a mano). Todas respetan tus preferencias.</p>",
                null, PageLayout.DOCUMENT, root.getId(), List.of(AREA_TAG))).id()));

        registroContainer();

        if (nodeRepository.findByParentIdAndDeletedAtIsNullOrderByTitleAsc(sesiones.getId()).isEmpty()) {
            generateWeek(1, ejercicios, sesiones, planStart(plan.getId()));
        }
        return status();
    }

    /** The Salud sub-pages, for the sidebar section's tree. */
    @Transactional(readOnly = true)
    public List<NodeTreeItem> tree() {
        return findRoot().map(r -> nodeService.children(r.getId())).orElseGet(List::of);
    }

    /** The plain text of the "Preferencias de comida" page (constraints for AI). */
    @Transactional(readOnly = true)
    public String preferencesText() {
        return nodeRepository.findByTitleIgnoreCaseAndDeletedAtIsNull("Preferencias de comida").stream()
                .findFirst()
                .map(n -> toPlainText(n.getContent()))
                .orElse("Sin preferencias registradas todavía.");
    }

    /** Today's generated menu, or null if none yet. */
    @Transactional(readOnly = true)
    public NodeResponse todayMenu() {
        return menuForDate(LocalDate.now().toString());
    }

    /** The generated menu for a date, or null. */
    @Transactional(readOnly = true)
    public NodeResponse menuForDate(String date) {
        return findRoot().flatMap(r -> childByTitle(r, COMIDAS))
                .flatMap(c -> nodeRepository.findByParentIdAndDeletedAtIsNullOrderByTitleAsc(c.getId()).stream()
                        .filter(n -> date.equals(prop(n.getId(), S_FECHA)))
                        .findFirst())
                .map(n -> nodeService.get(n.getId()))
                .orElse(null);
    }

    /** Jump the plan to a specific week (1..total), generating it if missing. */
    @Transactional
    public SaludStatusResponse setWeek(int n) {
        Node root = getOrCreateRoot();
        UUID planId = childByTitle(root, PLAN).orElseThrow(() -> new IllegalStateException("Área Salud no inicializada")).getId();
        int total = (int) number(planId, P_SEMANAS_TOTAL, 7);
        int wk = Math.max(1, Math.min(total, n));
        nodeService.upsertProperty(planId, new PropertyDto(P_SEMANA, PropertyType.NUMBER, String.valueOf(wk)));
        if (sessionsOfWeek(wk).isEmpty()) {
            Node ejercicios = childByTitle(root, EJERCICIOS).orElseThrow();
            Node sesiones = childByTitle(root, SESIONES).orElseThrow();
            generateWeek(wk, ejercicios, sesiones, planStart(planId));
        }
        return status();
    }

    /** Record a weigh-in (replacing any existing one for the same date). */
    @Transactional
    public SaludStatusResponse weighIn(double peso, String fecha) {
        Node root = getOrCreateRoot();
        Node pesoNode = childByTitle(root, PESO).orElseThrow(() -> new IllegalStateException("Área Salud no inicializada"));
        String f = fecha == null || fecha.isBlank() ? LocalDate.now().toString() : fecha;
        for (Node c : nodeRepository.findByParentIdAndDeletedAtIsNullOrderByTitleAsc(pesoNode.getId())) {
            if (f.equals(prop(c.getId(), S_FECHA))) {
                nodeService.delete(c.getId());
            }
        }
        NodeResponse w = nodeService.create(new CreateNodeRequest("Pesaje " + f,
                "<p>" + peso + " kg</p>", null, PageLayout.DOCUMENT, pesoNode.getId(), List.of(AREA_TAG)));
        nodeService.upsertProperty(w.id(), new PropertyDto(S_FECHA, PropertyType.DATE, f));
        nodeService.upsertProperty(w.id(), new PropertyDto("peso", PropertyType.NUMBER, String.valueOf(peso)));
        return status();
    }

    /** Create a recipe page under Recetas (used by the AI service). */
    @Transactional
    public NodeResponse createRecipePage(String title, String contentHtml) {
        Node root = getOrCreateRoot();
        Node recetas = childByTitle(root, RECETAS).orElseGet(() -> requireNode(nodeService.create(new CreateNodeRequest(
                RECETAS, "<p>Recetas.</p>", null, PageLayout.DOCUMENT, root.getId(), List.of(AREA_TAG))).id()));
        return nodeService.create(new CreateNodeRequest(title, contentHtml, null, PageLayout.DOCUMENT,
                recetas.getId(), List.of(RECIPE_TAG)));
    }

    // --- Food diary ----------------------------------------------------------

    /** Today's food diary (running kcal/protein vs targets + entries). */
    @Transactional(readOnly = true)
    public FoodDaySummary todayFood() {
        return foodDay(LocalDate.now().toString());
    }

    /** The food diary for a date. */
    @Transactional(readOnly = true)
    public FoodDaySummary foodDay(String date) {
        String d = date == null || date.isBlank() ? LocalDate.now().toString() : date;
        UUID planId = findRoot().flatMap(r -> childByTitle(r, PLAN)).map(Node::getId).orElse(null);
        int targetKcal = planId != null ? (int) number(planId, P_KCAL, 2000) : 2000;
        int targetProt = planId != null ? (int) number(planId, P_PROT, 150) : 150;

        List<FoodEntry> entries = new java.util.ArrayList<>();
        int totKcal = 0;
        int totProt = 0;
        Optional<Node> reg = findRoot().flatMap(r -> childByTitle(r, REGISTRO));
        if (reg.isPresent()) {
            for (Node c : nodeRepository.findByParentIdAndDeletedAtIsNullOrderByTitleAsc(reg.get().getId())) {
                if (!d.equals(prop(c.getId(), S_FECHA))) {
                    continue;
                }
                int k = (int) number(c.getId(), F_KCAL, 0);
                int p = (int) number(c.getId(), F_PROT, 0);
                totKcal += k;
                totProt += p;
                String nombre = prop(c.getId(), F_NOMBRE);
                entries.add(new FoodEntry(c.getId().toString(), nombre == null ? c.getTitle() : nombre, k, p));
            }
        }
        return new FoodDaySummary(d, targetKcal, totKcal, targetProt, totProt, entries);
    }

    /** Log a food item on a date (default today); returns the updated day summary. */
    @Transactional
    public FoodDaySummary addFood(String fecha, String nombre, Integer kcal, Integer proteina) {
        Node reg = registroContainer();
        String f = fecha == null || fecha.isBlank() ? LocalDate.now().toString() : fecha;
        String name = nombre == null || nombre.isBlank() ? "Comida" : nombre.trim();
        NodeResponse e = nodeService.create(new CreateNodeRequest(name, "", null, PageLayout.DOCUMENT,
                reg.getId(), List.of(FOOD_TAG)));
        nodeService.upsertProperty(e.id(), new PropertyDto(S_FECHA, PropertyType.DATE, f));
        nodeService.upsertProperty(e.id(), new PropertyDto(F_NOMBRE, PropertyType.TEXT, name));
        nodeService.upsertProperty(e.id(), new PropertyDto(F_KCAL, PropertyType.NUMBER, String.valueOf(kcal == null ? 0 : kcal)));
        nodeService.upsertProperty(e.id(), new PropertyDto(F_PROT, PropertyType.NUMBER, String.valueOf(proteina == null ? 0 : proteina)));
        return foodDay(f);
    }

    /** Remove a food entry; returns the updated day summary. */
    @Transactional
    public FoodDaySummary deleteFood(UUID id) {
        String f = prop(id, S_FECHA);
        requireNode(id);
        nodeService.delete(id);
        return foodDay(f == null ? LocalDate.now().toString() : f);
    }

    private Node registroContainer() {
        Node root = getOrCreateRoot();
        return childByTitle(root, REGISTRO).orElseGet(() -> {
            Node created = requireNode(nodeService.create(new CreateNodeRequest(REGISTRO,
                    "<p>Diario de comidas: lo que comes de verdad, con kcal. Añádelo desde el panel.</p>",
                    null, PageLayout.TABLE, root.getId(), List.of(AREA_TAG))).id());
            nodeService.setSchema(created.getId(), List.of(
                    new SchemaField(S_FECHA, PropertyType.DATE, null),
                    new SchemaField(F_NOMBRE, PropertyType.TEXT, null),
                    new SchemaField(F_KCAL, PropertyType.NUMBER, null),
                    new SchemaField(F_PROT, PropertyType.NUMBER, null)));
            return created;
        });
    }

    /** Save a day's menu under Comidas (replacing any existing one for that date). */
    @Transactional
    public NodeResponse saveDayMenu(String date, String title, String contentHtml) {
        Node root = getOrCreateRoot();
        Node comidas = childByTitle(root, COMIDAS).orElseGet(() -> {
            Node created = requireNode(nodeService.create(new CreateNodeRequest(COMIDAS,
                    "<p>Menú por día.</p>", null, PageLayout.CALENDAR, root.getId(), List.of(AREA_TAG))).id());
            nodeService.setSchema(created.getId(), List.of(
                    new SchemaField(S_FECHA, PropertyType.DATE, null),
                    new SchemaField("kcal", PropertyType.NUMBER, null)));
            return created;
        });
        for (Node c : nodeRepository.findByParentIdAndDeletedAtIsNullOrderByTitleAsc(comidas.getId())) {
            if (date.equals(prop(c.getId(), S_FECHA))) {
                nodeService.delete(c.getId());
            }
        }
        NodeResponse menu = nodeService.create(new CreateNodeRequest(title, contentHtml, null, PageLayout.DOCUMENT,
                comidas.getId(), List.of(DIET_DAY_TAG)));
        nodeService.upsertProperty(menu.id(), new PropertyDto(S_FECHA, PropertyType.DATE, date));
        return nodeService.get(menu.id());
    }

    // --- Reads ---------------------------------------------------------------

    /** Whether the Salud area has been scaffolded (root + plan present). */
    @Transactional(readOnly = true)
    public boolean exists() {
        return findRoot().flatMap(r -> childByTitle(r, PLAN)).isPresent();
    }

    /** Today's session(s) (by the {@code fecha} property). Empty if none/no area. */
    @Transactional(readOnly = true)
    public List<NodeResponse> today() {
        String today = LocalDate.now().toString();
        return sessions().stream()
                .filter(n -> today.equals(prop(n.getId(), S_FECHA)))
                .map(n -> nodeService.get(n.getId()))
                .toList();
    }

    /** All sessions of a given plan week, ordered by date. */
    @Transactional(readOnly = true)
    public List<NodeResponse> week(int weekNumber) {
        return sessions().stream()
                .filter(n -> String.valueOf(weekNumber).equals(prop(n.getId(), S_SEMANA)))
                .sorted(Comparator.comparing(n -> orEmpty(prop(n.getId(), S_FECHA))))
                .map(n -> nodeService.get(n.getId()))
                .toList();
    }

    /** The strength-progression records (children of "Ejercicios"). */
    @Transactional(readOnly = true)
    public List<NodeResponse> topes() {
        return findRoot().flatMap(r -> childByTitle(r, EJERCICIOS))
                .map(ej -> nodeRepository.findByParentIdAndDeletedAtIsNullOrderByTitleAsc(ej.getId()).stream()
                        .map(n -> nodeService.get(n.getId()))
                        .toList())
                .orElseGet(List::of);
    }

    @Transactional(readOnly = true)
    public SaludStatusResponse status() {
        Optional<Node> rootOpt = findRoot();
        if (rootOpt.isEmpty() || childByTitle(rootOpt.get(), PLAN).isEmpty()) {
            return new SaludStatusResponse(false, 0, 0, null, null, null, 0, 0, 0, null);
        }
        Node root = rootOpt.get();
        UUID planId = childByTitle(root, PLAN).get().getId();
        int semana = (int) number(planId, P_SEMANA, 1);
        int total = (int) number(planId, P_SEMANAS_TOTAL, 7);
        Double pesoIni = numberOrNull(planId, P_PESO_INI);
        Double pesoObj = numberOrNull(planId, P_PESO_OBJ);

        long hechas = countByState(EST_HECHO);
        long saltadas = countByState(EST_SALTADO);
        long pendientes = countByState(EST_PENDIENTE);

        List<double[]> weighins = weighins(root); // [epochDay, kg] ascending
        Double pesoActual = weighins.isEmpty() ? null : weighins.get(weighins.size() - 1)[1];

        return new SaludStatusResponse(true, semana, total, pesoIni, pesoObj, pesoActual,
                hechas, saltadas, pendientes, dietRecommendation(weighins));
    }

    // --- Mutations (the reactive engine) -------------------------------------

    /** Mark a session done: record effort/results and progress the involved topes. */
    @Transactional
    public NodeResponse completeSession(UUID sessionId, CompleteSessionRequest req) {
        Node session = requireNode(sessionId);
        if (req != null && req.exercises() != null) {
            for (ExerciseResultDto ex : req.exercises()) {
                if (ex != null && ex.topeId() != null && ex.reps() != null) {
                    progressTope(ex.topeId(), ex.reps());
                }
            }
        }
        if (req != null && req.durationMin() != null) {
            nodeService.upsertProperty(sessionId, new PropertyDto(S_DURACION, PropertyType.NUMBER, String.valueOf(req.durationMin())));
        }
        if (req != null && req.rpe() != null) {
            nodeService.upsertProperty(sessionId, new PropertyDto(S_RPE, PropertyType.RATING, String.valueOf(clamp(req.rpe(), 1, 5))));
        }
        if (req != null && req.notes() != null && !req.notes().isBlank()) {
            nodeService.upsertProperty(sessionId, new PropertyDto(S_RESULTADO, PropertyType.TEXT, req.notes().trim()));
        }
        return nodeService.upsertProperty(session.getId(), new PropertyDto(S_ESTADO, PropertyType.SELECT, EST_HECHO));
    }

    /** Mark a session skipped (its topes do not progress). */
    @Transactional
    public NodeResponse skipSession(UUID sessionId) {
        requireNode(sessionId);
        return nodeService.upsertProperty(sessionId, new PropertyDto(S_ESTADO, PropertyType.SELECT, EST_SALTADO));
    }

    /** Create a custom training session on a date (managed from the panel). */
    @Transactional
    public NodeResponse createSession(String fecha, String tipo, String objetivo) {
        Node root = getOrCreateRoot();
        Node sesiones = childByTitle(root, SESIONES).orElseThrow(() -> new IllegalStateException("Área Salud no inicializada"));
        UUID planId = childByTitle(root, PLAN).map(Node::getId).orElse(null);
        LocalDate date = parseDate(fecha, LocalDate.now());
        String t = tipo == null || tipo.isBlank() ? "Descanso" : tipo;
        String obj = objetivo == null ? "" : objetivo;
        String content = "<h2>" + escapeHtml(t) + "</h2>" + (obj.isBlank() ? "" : "<p>" + escapeHtml(obj) + "</p>");
        return createSession(sesiones, weekOf(date, planId), date, t, content, obj);
    }

    /** Edit an existing session (any of tipo/objetivo/fecha/estado). */
    @Transactional
    public NodeResponse updateSession(UUID id, String fecha, String tipo, String objetivo, String estado) {
        Node session = requireNode(id);
        if (tipo != null && !tipo.isBlank()) {
            nodeService.upsertProperty(id, new PropertyDto(S_TIPO, PropertyType.SELECT, tipo));
        }
        if (objetivo != null) {
            nodeService.upsertProperty(id, new PropertyDto(S_OBJETIVO, PropertyType.TEXT, objetivo));
        }
        if (estado != null && !estado.isBlank()) {
            nodeService.upsertProperty(id, new PropertyDto(S_ESTADO, PropertyType.SELECT, estado));
        }
        if (fecha != null && !fecha.isBlank()) {
            UUID planId = findRoot().flatMap(r -> childByTitle(r, PLAN)).map(Node::getId).orElse(null);
            LocalDate date = parseDate(fecha, LocalDate.now());
            nodeService.upsertProperty(id, new PropertyDto(S_FECHA, PropertyType.DATE, date.toString()));
            nodeService.upsertProperty(id, new PropertyDto(S_SEMANA, PropertyType.NUMBER, String.valueOf(weekOf(date, planId))));
        }
        // Retitle to match the (possibly new) date + tipo.
        String curFecha = prop(id, S_FECHA);
        String curTipo = prop(id, S_TIPO);
        if (curFecha != null && curTipo != null) {
            session.setTitle(sessionTitle(parseDate(curFecha, LocalDate.now()), curTipo));
            nodeRepository.saveAndFlush(session);
        }
        return nodeService.get(id);
    }

    /** Delete a session (to trash). */
    @Transactional
    public void deleteSession(UUID id) {
        requireNode(id);
        nodeService.delete(id);
    }

    /** The plan week a date falls in (1-based; clamped to >= 1). */
    private int weekOf(LocalDate date, UUID planId) {
        LocalDate start = planId != null ? planStart(planId) : date;
        long days = ChronoUnit.DAYS.between(start, date);
        return (int) Math.max(1, days / 7 + 1);
    }

    private LocalDate parseDate(String s, LocalDate fallback) {
        try {
            return s == null || s.isBlank() ? fallback : LocalDate.parse(s);
        } catch (Exception e) {
            return fallback;
        }
    }

    /**
     * Regenerate every still-pending week from the current week onward, using the
     * latest topes and the running schedule. Completed/skipped sessions are kept.
     * Then advance to the current week's Monday. Returns the fresh status.
     */
    @Transactional
    public SaludStatusResponse recalculate() {
        Node root = getOrCreateRoot();
        Node ejercicios = childByTitle(root, EJERCICIOS).orElseThrow(() -> new IllegalStateException("Área Salud no inicializada"));
        Node sesiones = childByTitle(root, SESIONES).orElseThrow(() -> new IllegalStateException("Área Salud no inicializada"));
        UUID planId = childByTitle(root, PLAN).orElseThrow(() -> new IllegalStateException("Área Salud no inicializada")).getId();

        int semanaActual = (int) number(planId, P_SEMANA, 1);
        int total = (int) number(planId, P_SEMANAS_TOTAL, 7);
        LocalDate start = planStart(planId);

        for (int w = semanaActual; w <= total; w++) {
            // Drop only the pending sessions of this week; keep done/skipped history.
            for (Node s : sessionsOfWeek(w)) {
                if (!EST_PENDIENTE.equals(prop(s.getId(), S_ESTADO))) {
                    continue;
                }
                nodeService.delete(s.getId());
            }
            generateWeek(w, ejercicios, sesiones, start);
        }
        return status();
    }

    /** Move the plan on to the next week and generate it if missing. */
    @Transactional
    public SaludStatusResponse advanceWeek() {
        Node root = getOrCreateRoot();
        UUID planId = childByTitle(root, PLAN).orElseThrow(() -> new IllegalStateException("Área Salud no inicializada")).getId();
        int semana = (int) number(planId, P_SEMANA, 1);
        int total = (int) number(planId, P_SEMANAS_TOTAL, 7);
        int next = Math.min(total, semana + 1);
        nodeService.upsertProperty(planId, new PropertyDto(P_SEMANA, PropertyType.NUMBER, String.valueOf(next)));
        if (sessionsOfWeek(next).isEmpty()) {
            Node ejercicios = childByTitle(root, EJERCICIOS).orElseThrow();
            Node sesiones = childByTitle(root, SESIONES).orElseThrow();
            generateWeek(next, ejercicios, sesiones, planStart(planId));
        }
        return status();
    }

    // --- Generation ----------------------------------------------------------

    private void generateWeek(int week, Node ejercicios, Node sesiones, LocalDate planStart) {
        LocalDate monday = planStart.plusWeeks(week - 1L);
        int idx = Math.min(week, RUN_Z2.length) - 1;
        String sets = SETS[Math.min(week, SETS.length) - 1];
        boolean deload = week % 4 == 0;

        createSession(sesiones, week, monday, "Calistenia A",
                strengthContent("Calistenia A · Empuje", DAY_A, ejercicios, sets, deload),
                strengthObjective(DAY_A, ejercicios, sets));
        createSession(sesiones, week, monday.plusDays(1), "Carrera Z2",
                "<h2>Carrera · Z2 fácil</h2><p><strong>" + RUN_Z2[idx] + "' continuos</strong> a ritmo cómodo (puedes hablar). Calienta/enfría 3'.</p>",
                RUN_Z2[idx] + "' Z2 fácil");
        createSession(sesiones, week, monday.plusDays(2), "Calistenia B",
                strengthContent("Calistenia B · Tirón + Pierna", DAY_B, ejercicios, sets, deload),
                strengthObjective(DAY_B, ejercicios, sets));
        createSession(sesiones, week, monday.plusDays(3), "Carrera intervalos",
                "<h2>Carrera · Intervalos</h2><p>Calienta 5'. <strong>" + RUN_INT[idx] + "</strong>. Enfría 5'.</p>",
                "Intervalos: " + RUN_INT[idx]);
        createSession(sesiones, week, monday.plusDays(4), "Calistenia C",
                strengthContent("Calistenia C · Full body", DAY_C, ejercicios, sets, deload),
                strengthObjective(DAY_C, ejercicios, sets));
        createSession(sesiones, week, monday.plusDays(5), "Carrera larga",
                "<h2>Carrera · Larga continua</h2><p><strong>" + RUN_LONG[idx] + "' seguidos</strong> a ritmo suave. Suma minutos sin parar.</p>",
                RUN_LONG[idx] + "' continuos");
        createSession(sesiones, week, monday.plusDays(6), "Descanso",
                "<h2>Descanso</h2><p>Libre o andar 40-60'. Recupera, estira, duerme 7-8h." + (deload ? " Semana de descarga: cuídate." : "") + "</p>",
                "Descanso activo");
    }

    private NodeResponse createSession(Node sesiones, int week, LocalDate date, String tipo, String content, String objetivo) {
        NodeResponse s = nodeService.create(new CreateNodeRequest(sessionTitle(date, tipo), content, null,
                PageLayout.DOCUMENT, sesiones.getId(), List.of(SESSION_TAG)));
        nodeService.upsertProperty(s.id(), new PropertyDto(S_FECHA, PropertyType.DATE, date.toString()));
        nodeService.upsertProperty(s.id(), new PropertyDto(S_SEMANA, PropertyType.NUMBER, String.valueOf(week)));
        nodeService.upsertProperty(s.id(), new PropertyDto(S_TIPO, PropertyType.SELECT, tipo));
        nodeService.upsertProperty(s.id(), new PropertyDto(S_ESTADO, PropertyType.SELECT, EST_PENDIENTE));
        nodeService.upsertProperty(s.id(), new PropertyDto(S_OBJETIVO, PropertyType.TEXT, objetivo));
        return nodeService.get(s.id());
    }

    private String sessionTitle(LocalDate date, String tipo) {
        String dow = capitalize(date.getDayOfWeek().getDisplayName(TextStyle.SHORT, new Locale("es")));
        return dow + " " + String.format("%02d/%02d", date.getDayOfMonth(), date.getMonthValue()) + " · " + tipo;
    }

    private String strengthContent(String heading, List<String> exercises, Node ejercicios, String sets, boolean deload) {
        StringBuilder sb = new StringBuilder("<h2>").append(heading).append("</h2>");
        sb.append("<p><strong>").append(deload ? "Descarga · " : "").append(sets)
                .append(" series</strong> · RIR 1-2 · descanso 60-90s.</p>");
        sb.append("<ul data-type=\"taskList\">");
        for (String name : exercises) {
            Optional<Node> tope = topeByName(ejercicios, name);
            String level = tope.map(t -> ladderName(name, (int) number(t.getId(), T_NIVEL, 0))).orElse("");
            int reps = tope.map(t -> (int) number(t.getId(), T_REPS_OBJ, 10)).orElse(10);
            sb.append("<li data-type=\"taskItem\" data-checked=\"false\"><p>")
                    .append(name);
            if (!level.isBlank()) {
                sb.append(" (").append(level).append(")");
            }
            sb.append(" — ").append(sets).append("×").append(reps).append(" reps</p></li>");
        }
        sb.append("</ul>");
        return sb.toString();
    }

    private String strengthObjective(List<String> exercises, Node ejercicios, String sets) {
        List<String> parts = new ArrayList<>();
        for (String name : exercises) {
            int reps = topeByName(ejercicios, name).map(t -> (int) number(t.getId(), T_REPS_OBJ, 10)).orElse(10);
            parts.add(name + " " + sets + "×" + reps);
        }
        return String.join(" · ", parts);
    }

    // --- Progression ---------------------------------------------------------

    private void progressTope(UUID topeId, int reps) {
        int nivel = (int) number(topeId, T_NIVEL, 0);
        int objetivo = (int) number(topeId, T_REPS_OBJ, REP_BOTTOM + 2);
        int mejor = (int) number(topeId, T_MEJOR, 0);
        int enTope = (int) number(topeId, T_SESIONES_TOPE, 0);
        String patron = prop(topeId, T_PATRON);
        String name = requireNode(topeId).getTitle();
        int maxLevel = LADDERS.getOrDefault(name, List.of("")).size() - 1;

        mejor = Math.max(mejor, reps);

        if (reps >= REP_TOP) {
            enTope++;
            if (enTope >= 2 && nivel < maxLevel) {
                nivel++;
                objetivo = REP_BOTTOM;
                mejor = 0;
                enTope = 0;
            } else {
                objetivo = REP_TOP; // capped; keep pushing this level (or top level)
            }
        } else {
            enTope = 0;
            objetivo = Math.min(REP_TOP, Math.max(objetivo, reps + 1));
        }

        nodeService.upsertProperty(topeId, new PropertyDto(T_NIVEL, PropertyType.NUMBER, String.valueOf(nivel)));
        nodeService.upsertProperty(topeId, new PropertyDto(T_REPS_OBJ, PropertyType.NUMBER, String.valueOf(objetivo)));
        nodeService.upsertProperty(topeId, new PropertyDto(T_MEJOR, PropertyType.NUMBER, String.valueOf(mejor)));
        nodeService.upsertProperty(topeId, new PropertyDto(T_SESIONES_TOPE, PropertyType.NUMBER, String.valueOf(enTope)));
        if (patron == null) {
            // no-op: patron seeded at creation
        }
    }

    // --- Diet recommendation from weigh-in trend -----------------------------

    private String dietRecommendation(List<double[]> weighins) {
        if (weighins.size() < 2) {
            return "Registra el peso cada lunes para poder ajustar el déficit.";
        }
        double[] last = weighins.get(weighins.size() - 1);
        // Find the earliest weigh-in within ~2 weeks before the last one.
        double[] ref = weighins.get(0);
        for (double[] w : weighins) {
            if (last[0] - w[0] <= 15) { // within 15 days
                ref = w;
                break;
            }
        }
        double days = Math.max(1, last[0] - ref[0]);
        double perWeek = (ref[1] - last[1]) / days * 7.0; // kg lost per week (positive = losing)

        if (perWeek < 0.2) {
            return "Estancado (" + fmt(perWeek) + " kg/sem). Baja 150 kcal o suma ~1000 pasos/día. No recortes proteína.";
        }
        if (perWeek > 1.0) {
            return "Bajas rápido (" + fmt(perWeek) + " kg/sem). Sube 150 kcal para proteger músculo.";
        }
        return "Ritmo correcto (" + fmt(perWeek) + " kg/sem). Mantén el plan.";
    }

    // --- Seeding -------------------------------------------------------------

    private void seedPlanDefaults(UUID planId) {
        setIfMissing(planId, P_PESO_INI, PropertyType.NUMBER, "74");
        setIfMissing(planId, P_PESO_OBJ, PropertyType.NUMBER, "70");
        setIfMissing(planId, P_FECHA_INICIO, PropertyType.DATE,
                LocalDate.now().with(TemporalAdjusters.next(DayOfWeek.MONDAY)).toString());
        setIfMissing(planId, P_DIAS, PropertyType.NUMBER, "6");
        setIfMissing(planId, P_SEMANA, PropertyType.NUMBER, "1");
        setIfMissing(planId, P_SEMANAS_TOTAL, PropertyType.NUMBER, "7");
        setIfMissing(planId, P_KCAL, PropertyType.NUMBER, "2000");
        setIfMissing(planId, P_PROT, PropertyType.NUMBER, "150");
    }

    private void seedTopes(Node ejercicios) {
        if (!nodeRepository.findByParentIdAndDeletedAtIsNullOrderByTitleAsc(ejercicios.getId()).isEmpty()) {
            return;
        }
        Map<String, String> patrones = new LinkedHashMap<>();
        patrones.put("Flexiones", "Empuje");
        patrones.put("Fondos", "Empuje");
        patrones.put("Pica push-up", "Empuje");
        patrones.put("Dominadas", "Tirón");
        patrones.put("Remo australiano", "Tirón");
        patrones.put("Sentadilla", "Pierna");
        patrones.put("Hip thrust", "Pierna");
        patrones.put("Core", "Core");

        for (Map.Entry<String, String> e : patrones.entrySet()) {
            NodeResponse t = nodeService.create(new CreateNodeRequest(e.getKey(),
                    "<p>Progresión: " + String.join(" → ", LADDERS.getOrDefault(e.getKey(), List.of())) + "</p>",
                    null, PageLayout.DOCUMENT, ejercicios.getId(), List.of(TOPE_TAG)));
            nodeService.upsertProperty(t.id(), new PropertyDto(T_PATRON, PropertyType.SELECT, e.getValue()));
            nodeService.upsertProperty(t.id(), new PropertyDto(T_NIVEL, PropertyType.NUMBER, "0"));
            nodeService.upsertProperty(t.id(), new PropertyDto(T_REPS_OBJ, PropertyType.NUMBER, "10"));
            nodeService.upsertProperty(t.id(), new PropertyDto(T_MEJOR, PropertyType.NUMBER, "0"));
            nodeService.upsertProperty(t.id(), new PropertyDto(T_SESIONES_TOPE, PropertyType.NUMBER, "0"));
        }
    }

    // --- Helpers -------------------------------------------------------------

    private List<Node> sessions() {
        return nodeRepository.findByTagName(SESSION_TAG);
    }

    private List<Node> sessionsOfWeek(int week) {
        return sessions().stream()
                .filter(n -> String.valueOf(week).equals(prop(n.getId(), S_SEMANA)))
                .toList();
    }

    private long countByState(String state) {
        return sessions().stream().filter(n -> state.equals(prop(n.getId(), S_ESTADO))).count();
    }

    /** Weigh-ins as [epochDay, kg], ascending by date. */
    private List<double[]> weighins(Node root) {
        Optional<Node> peso = childByTitle(root, PESO);
        if (peso.isEmpty()) {
            return List.of();
        }
        List<double[]> out = new ArrayList<>();
        for (Node child : nodeRepository.findByParentIdAndDeletedAtIsNullOrderByTitleAsc(peso.get().getId())) {
            String fecha = prop(child.getId(), S_FECHA);
            Double kg = numberOrNull(child.getId(), "peso");
            if (fecha != null && !fecha.isBlank() && kg != null) {
                try {
                    out.add(new double[]{LocalDate.parse(fecha).toEpochDay(), kg});
                } catch (Exception ignored) {
                    // skip malformed date
                }
            }
        }
        out.sort(Comparator.comparingDouble(a -> a[0]));
        return out;
    }

    private LocalDate planStart(UUID planId) {
        String raw = prop(planId, P_FECHA_INICIO);
        try {
            return raw == null || raw.isBlank()
                    ? LocalDate.now().with(TemporalAdjusters.next(DayOfWeek.MONDAY))
                    : LocalDate.parse(raw);
        } catch (Exception e) {
            return LocalDate.now().with(TemporalAdjusters.next(DayOfWeek.MONDAY));
        }
    }

    private Optional<Node> topeByName(Node ejercicios, String name) {
        return nodeRepository.findByParentIdAndDeletedAtIsNullOrderByTitleAsc(ejercicios.getId()).stream()
                .filter(n -> name.equalsIgnoreCase(n.getTitle()))
                .findFirst();
    }

    private String ladderName(String exercise, int level) {
        List<String> ladder = LADDERS.getOrDefault(exercise, List.of());
        if (ladder.isEmpty()) {
            return "";
        }
        return ladder.get(Math.max(0, Math.min(level, ladder.size() - 1)));
    }

    private Optional<Node> findRoot() {
        return nodeRepository.findByTitleIgnoreCaseAndDeletedAtIsNull(ROOT).stream()
                .filter(n -> n.getParent() == null)
                .findFirst();
    }

    private Node getOrCreateRoot() {
        return findRoot().orElseGet(() -> {
            Node created = new Node();
            created.setTitle(ROOT);
            created.setLayout(PageLayout.DOCUMENT);
            created.getTags().addAll(List.of());
            return nodeRepository.saveAndFlush(created);
        });
    }

    private Optional<Node> childByTitle(Node parent, String title) {
        return nodeRepository.findByParentIdAndDeletedAtIsNullOrderByTitleAsc(parent.getId()).stream()
                .filter(n -> title.equalsIgnoreCase(n.getTitle()))
                .findFirst();
    }

    private Node requireNode(UUID id) {
        return nodeRepository.findById(id)
                .filter(n -> n.getDeletedAt() == null)
                .orElseThrow(() -> new IllegalArgumentException("Node not found: " + id));
    }

    private void setIfMissing(UUID nodeId, String name, PropertyType type, String value) {
        String current = prop(nodeId, name);
        if (current == null || current.isBlank()) {
            nodeService.upsertProperty(nodeId, new PropertyDto(name, type, value));
        }
    }

    private String prop(UUID nodeId, String name) {
        return propertyRepository.findByNodeIdAndName(nodeId, name).map(p -> p.getValue()).orElse(null);
    }

    private double number(UUID nodeId, String name, double fallback) {
        Double v = numberOrNull(nodeId, name);
        return v == null ? fallback : v;
    }

    private Double numberOrNull(UUID nodeId, String name) {
        String raw = prop(nodeId, name);
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return Double.parseDouble(raw.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static int clamp(int v, int lo, int hi) {
        return Math.max(lo, Math.min(hi, v));
    }

    private static String orEmpty(String s) {
        return s == null ? "" : s;
    }

    private static String escapeHtml(String s) {
        return s == null ? "" : s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    private static String toPlainText(String html) {
        if (html == null) {
            return "";
        }
        return html
                .replaceAll("(?is)<(script|style)[^>]*>.*?</\\1>", " ")
                .replaceAll("<[^>]+>", " ")
                .replace("&nbsp;", " ")
                .replace("&amp;", "&")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private static String capitalize(String s) {
        if (s == null || s.isEmpty()) {
            return s;
        }
        String base = s.replace(".", "");
        return base.substring(0, 1).toUpperCase(new Locale("es")) + base.substring(1);
    }

    private static String fmt(double v) {
        return String.format(new Locale("es"), "%.1f", v);
    }
}
