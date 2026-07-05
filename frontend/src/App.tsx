import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import AuthGate from "./components/AuthGate";
import Layout from "./components/Layout";
import NodesPage from "./pages/NodesPage";
import NodePage from "./pages/NodePage";
import SearchPage from "./pages/SearchPage";
import AskPage from "./pages/AskPage";
import TrashPage from "./pages/TrashPage";
import SettingsPage from "./pages/SettingsPage";
import PublicPage from "./pages/PublicPage";

// Heavy, rarely-first pages (React Flow) load on demand to keep the initial bundle lean.
const GraphPage = lazy(() => import("./pages/GraphPage"));

function AppRoutes() {
  return (
    <AuthGate>
      <Suspense fallback={null}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<NodesPage />} />
            <Route path="nodes/:id" element={<NodePage />} />
            <Route path="graph" element={<GraphPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="ask" element={<AskPage />} />
            <Route path="trash" element={<TrashPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </Suspense>
    </AuthGate>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/p/:token" element={<PublicPage />} />
      <Route path="/*" element={<AppRoutes />} />
    </Routes>
  );
}
