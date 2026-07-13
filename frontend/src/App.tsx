import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import AuthGate from "./components/AuthGate";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import InboxPage from "./pages/InboxPage";
import TasksPage from "./pages/TasksPage";
import SnippetsPage from "./pages/SnippetsPage";
import ExamPage from "./pages/ExamPage";
import NodePage from "./pages/NodePage";
import SearchPage from "./pages/SearchPage";
import AskPage from "./pages/AskPage";
import ReviewPage from "./pages/ReviewPage";
import TimelinePage from "./pages/TimelinePage";
import TrashPage from "./pages/TrashPage";
import SettingsPage from "./pages/SettingsPage";
import PublicPage from "./pages/PublicPage";
import GardenPage from "./pages/GardenPage";
import GuidePage from "./pages/GuidePage";
import SaludPage from "./pages/SaludPage";

// Heavy, rarely-first pages (React Flow) load on demand to keep the initial bundle lean.
const GraphPage = lazy(() => import("./pages/GraphPage"));

function AppRoutes() {
  return (
    <AuthGate>
      <Suspense fallback={null}>
        <Routes>
          {/* Full-page, no sidebar — clean for print. */}
          <Route path="guide" element={<GuidePage />} />
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="nodes/:id" element={<NodePage />} />
            <Route path="graph" element={<GraphPage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="ask" element={<AskPage />} />
            <Route path="review" element={<ReviewPage />} />
            <Route path="salud" element={<SaludPage />} />
            <Route path="exam" element={<ExamPage />} />
            <Route path="timeline" element={<TimelinePage />} />
            <Route path="inbox" element={<InboxPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="snippets" element={<SnippetsPage />} />
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
      <Route path="/garden" element={<GardenPage />} />
      <Route path="/*" element={<AppRoutes />} />
    </Routes>
  );
}
