import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { setSession } from "@/lib/auth";
import { useI18n } from "@/i18n/I18nContext";
import { Button, Input } from "@/components/ui";

export default function AuthPage({ onAuthenticated }: { onAuthenticated: () => void }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const auth = useMutation({
    mutationFn: () =>
      mode === "login"
        ? api.auth.login({ username, password })
        : api.auth.register({ username, email, password }),
    onSuccess: (data) => {
      setSession(data.token, data.username);
      onAuthenticated();
    },
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    auth.mutate();
  };

  const errorMessage = auth.error instanceof ApiError ? auth.error.message : null;

  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden bg-app p-6">
      {/* Ambient glow behind the card */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-[480px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(closest-side, #6d7ef2, transparent)" }}
      />

      <form
        onSubmit={submit}
        className="fade-up relative w-full max-w-sm rounded-2xl border border-line bg-panel p-8 shadow-2xl shadow-black/50"
      >
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-violet-500 text-lg font-bold text-white shadow-[0_4px_16px_rgba(109,126,242,0.45)]">
            E
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold tracking-tight text-ink">Engram</h1>
            <p className="mt-0.5 text-[13px] text-dim">
              {mode === "login" ? t("auth.loginTitle") : t("auth.registerTitle")}
            </p>
          </div>
        </div>

        <label className="mb-1.5 block text-xs font-medium text-mid">{t("auth.username")}</label>
        <Input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />

        {mode === "register" && (
          <>
            <label className="mb-1.5 mt-4 block text-xs font-medium text-mid">{t("auth.email")}</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </>
        )}

        <label className="mb-1.5 mt-4 block text-xs font-medium text-mid">{t("auth.password")}</label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

        {errorMessage && <p className="mt-3 text-sm text-red-400">{errorMessage}</p>}

        <Button type="submit" className="mt-6 w-full justify-center py-2" disabled={auth.isPending}>
          {mode === "login" ? t("auth.login") : t("auth.register")}
        </Button>

        <button
          type="button"
          className="mt-4 w-full text-center text-xs text-dim transition hover:text-mid"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            auth.reset();
          }}
        >
          {mode === "login" ? t("auth.toRegister") : t("auth.toLogin")}
        </button>
      </form>
    </div>
  );
}
