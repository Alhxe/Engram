import { useState, type ReactNode } from "react";
import { hasToken } from "@/lib/auth";
import AuthPage from "@/pages/AuthPage";

export default function AuthGate({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(hasToken());

  if (!authenticated) {
    return <AuthPage onAuthenticated={() => setAuthenticated(true)} />;
  }
  return <>{children}</>;
}
