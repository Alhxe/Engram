import { useEffect, useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { useI18n } from "@/i18n/I18nContext";

interface HelpItem {
  title: string;
  body: string;
}

const HELP: Record<"es" | "en", { heading: string; items: HelpItem[] }> = {
  es: {
    heading: "¿Qué es cada cosa?",
    items: [
      { title: "Páginas", body: "Todo es una página. Una página puede contener otras páginas: anídalas arrastrándolas en el menú de la izquierda, como carpetas." },
      { title: "Etiquetas", body: "Palabras sueltas (#idea, #urgente) para clasificar y filtrar. Escribe y pulsa Enter; se comparten entre todas las páginas." },
      { title: "Propiedades", body: "Campos con nombre + tipo + valor (Estado, Fecha, Número…). Dan estructura: son las columnas de la Tabla, el agrupador del Tablero y las fechas del Calendario." },
      { title: "Vistas de subpáginas", body: "Las subpáginas de una página se ven como Lista, Tabla, Tablero (kanban), Calendario o Mapa de ideas." },
      { title: "Enlaces [[...]]", body: "Escribe [[Título]] en el texto para enlazar con otra página (se crea si no existe). Se resaltan en color." },
      { title: "Retroenlaces", body: "Al final de cada página ves qué otras páginas la mencionan." },
      { title: "Grafo", body: "En el menú, muestra todas tus páginas y sus enlaces como una red visual." },
      { title: "Búsqueda", body: "Busca en TODO: título, contenido, etiquetas y valores de las propiedades." },
      { title: "Autoguardado", body: "No hay botón Guardar: los cambios se guardan solos. La barra de formato aparece al seleccionar texto." },
      { title: "Claves de API", body: "En Ajustes creas claves para que otro programa o una IA lean/escriban tus notas por la API (no son para iniciar sesión)." },
    ],
  },
  en: {
    heading: "What is what?",
    items: [
      { title: "Pages", body: "Everything is a page. A page can contain other pages: nest them by dragging in the left menu, like folders." },
      { title: "Tags", body: "Loose labels (#idea, #urgent) to categorize and filter. Type and press Enter; they are shared across all pages." },
      { title: "Properties", body: "Named typed fields (Status, Date, Number…). They add structure: the columns of the Table, the grouping of the Board and the dates of the Calendar." },
      { title: "Sub-page views", body: "A page's sub-pages can be shown as List, Table, Board (kanban), Calendar or Mind map." },
      { title: "Links [[...]]", body: "Type [[Title]] in the text to link to another page (created if missing). They are highlighted." },
      { title: "Backlinks", body: "At the bottom of each page you see which other pages mention it." },
      { title: "Graph", body: "In the menu, shows all your pages and their links as a visual network." },
      { title: "Search", body: "Searches EVERYTHING: title, content, tags and property values." },
      { title: "Autosave", body: "No Save button: changes are saved automatically. The format bar appears when you select text." },
      { title: "API keys", body: "In Settings you create keys so another program or an AI can read/write your notes via the API (not for logging in)." },
    ],
  },
};

export default function HelpButton() {
  const { lang } = useI18n();
  const [open, setOpen] = useState(false);
  const help = HELP[lang] ?? HELP.en;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-dim transition hover:bg-elev hover:text-ink"
        title={help.heading}
      >
        <HelpCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="fade-up max-h-[80vh] w-full max-w-lg overflow-auto rounded-2xl border border-line bg-panel p-6 shadow-2xl shadow-black/50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">{help.heading}</h2>
              <button
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-dim transition hover:bg-elev hover:text-ink"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>
            <div className="space-y-3.5">
              {help.items.map((item) => (
                <div key={item.title}>
                  <h3 className="text-sm font-semibold text-accent2">{item.title}</h3>
                  <p className="mt-0.5 text-sm leading-relaxed text-mid">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
