import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { CalendarClock, CalendarDays, GitBranch, GraduationCap, HelpCircle, Home, LogOut, Menu, Moon, Network, Plus, Search, Settings, Sparkles, Star, Sun, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";
import { useCreateNode, useFavorites } from "@/lib/queries";
import { clearSession, getUsername } from "@/lib/auth";
import { getTheme, toggleTheme } from "@/lib/theme";
import { useI18n } from "@/i18n/I18nContext";
import PageTree from "./PageTree";
import HelpButton from "./HelpButton";
import InfoHint from "./InfoHint";
import CommandPalette from "./CommandPalette";
import GithubImportDialog from "./GithubImportDialog";
import QuestionDialog from "./QuestionDialog";
import AcademiaNav from "./AcademiaNav";

function NavItem({ to, icon: Icon, label }: { to: string; icon: typeof Home; label: string }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition ${
          isActive
            ? "bg-elev font-medium text-ink"
            : "text-mid hover:bg-elev/60 hover:text-ink"
        }`
      }
    >
      <Icon className="h-4 w-4 text-dim transition group-hover:text-mid" strokeWidth={1.75} />
      {label}
    </NavLink>
  );
}

export default function Layout() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const createNode = useCreateNode();
  const { data: favorites } = useFavorites();
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setThemeState] = useState(getTheme());
  const [githubOpen, setGithubOpen] = useState(false);
  const [questionOpen, setQuestionOpen] = useState(false);
  const location = useLocation();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => setMobileOpen(false), [location.pathname]);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setQuery("");
    }
  };

  const newPage = () => {
    createNode.mutate(
      { title: t("common.untitled"), content: "" },
      { onSuccess: (node) => navigate(`/nodes/${node.id}`) },
    );
  };

  const daily = useMutation({
    mutationFn: () => {
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      return api.nodes.daily(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    },
    onSuccess: (node) => navigate(`/nodes/${node.id}`),
  });

  return (
    <div className="flex h-full bg-app">
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-20 flex h-12 items-center gap-3 border-b border-line bg-panel px-3 md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-mid hover:bg-elev"
        >
          <Menu className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-violet-500 text-xs font-bold text-white">
            E
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-ink">Engram</span>
        </Link>
      </div>

      {/* Backdrop for the mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[264px] shrink-0 flex-col border-r border-line bg-panel transition-transform md:static md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute right-2 top-3 flex h-7 w-7 items-center justify-center rounded-md text-dim hover:bg-elev md:hidden"
        >
          <X className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-violet-500 text-xs font-bold text-white shadow-[0_2px_8px_rgba(109,126,242,0.4)]">
              E
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-ink">Engram</span>
          </Link>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setQuestionOpen(true)}
              className="flex h-6 w-6 items-center justify-center rounded-md bg-elev text-mid transition hover:bg-line2 hover:text-ink"
              title={t("question.add")}
            >
              <HelpCircle className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
            <button
              onClick={() => setGithubOpen(true)}
              className="flex h-6 w-6 items-center justify-center rounded-md bg-elev text-mid transition hover:bg-line2 hover:text-ink"
              title={t("github.add")}
            >
              <GitBranch className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
            <button
              onClick={newPage}
              disabled={createNode.isPending}
              className="flex h-6 w-6 items-center justify-center rounded-md bg-elev text-mid transition hover:bg-line2 hover:text-ink"
              title={t("pages.new")}
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="px-3 pt-2">
          <form onSubmit={submitSearch} className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-dim"
              strokeWidth={2}
            />
            <input
              className="w-full rounded-lg border border-line bg-card py-1.5 pl-8 pr-2 text-[13px] text-ink outline-none transition placeholder:text-dim hover:border-line2 focus:border-accent/50"
              placeholder={t("search.placeholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </form>
        </div>

        <nav className="mt-3 space-y-px px-3">
          <NavItem to="/" icon={Home} label={t("nav.home")} />
          <div className="flex items-center">
            <button
              onClick={() => daily.mutate()}
              disabled={daily.isPending}
              className="group flex flex-1 items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] text-mid transition hover:bg-elev/60 hover:text-ink"
            >
              <CalendarDays className="h-4 w-4 text-dim transition group-hover:text-mid" strokeWidth={1.75} />
              {t("nav.today")}
            </button>
            <InfoHint text={t("help.today")} className="px-1.5" />
          </div>
          <NavItem to="/ask" icon={Sparkles} label={t("nav.ask")} />
          <NavItem to="/review" icon={GraduationCap} label={t("nav.review")} />
          <NavItem to="/timeline" icon={CalendarClock} label={t("nav.timeline")} />
          <NavItem to="/graph" icon={Network} label={t("nav.graph")} />
          <NavItem to="/trash" icon={Trash2} label={t("nav.trash")} />
          <NavItem to="/settings" icon={Settings} label={t("nav.settings")} />
        </nav>

        {favorites && favorites.length > 0 && (
          <div className="mt-5 px-3">
            <span className="px-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-dim">
              {t("nav.favorites")}
            </span>
            <div className="mt-1 space-y-px">
              {favorites.map((fav) => (
                <Link
                  key={fav.id}
                  to={`/nodes/${fav.id}`}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-1 text-[13px] text-mid transition hover:bg-elev/60 hover:text-ink"
                >
                  <Star className="h-3.5 w-3.5 shrink-0 text-amber-400/80" strokeWidth={1.75} fill="currentColor" />
                  <span className="truncate">{fav.title || t("common.untitled")}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <AcademiaNav />

        <div className="mt-5 px-4">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-dim">
            {t("nav.pages")}
          </span>
        </div>
        <div className="mt-1.5 flex-1 overflow-y-auto px-3 pb-2">
          <PageTree />
        </div>

        <div className="flex items-center gap-2.5 border-t border-line px-3 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-elev text-xs font-semibold text-mid">
            {(getUsername() ?? "?").slice(0, 1).toUpperCase()}
          </div>
          <span className="min-w-0 flex-1 truncate text-[13px] text-mid">{getUsername()}</span>
          <button
            onClick={() => setThemeState(toggleTheme())}
            className="flex h-7 w-7 items-center justify-center rounded-md text-dim transition hover:bg-elev hover:text-ink"
            title={theme === "dark" ? t("theme.toLight") : t("theme.toDark")}
          >
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" strokeWidth={1.75} /> : <Moon className="h-3.5 w-3.5" strokeWidth={1.75} />}
          </button>
          <HelpButton />
          <button
            onClick={() => {
              clearSession();
              window.location.reload();
            }}
            className="flex h-7 w-7 items-center justify-center rounded-md text-dim transition hover:bg-elev hover:text-ink"
            title={t("sidebar.signOut")}
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </div>
      </aside>

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden pt-12 md:pt-0">
        <Outlet />
      </main>

      <CommandPalette />
      {githubOpen && <GithubImportDialog onClose={() => setGithubOpen(false)} />}
      {questionOpen && <QuestionDialog onClose={() => setQuestionOpen(false)} />}
    </div>
  );
}
