"use client";

import { useEffect, useState } from "react";
import { Code2, KeyRound, Loader2, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/format";

type DeveloperToken = {
  id: string;
  name: string;
  tokenPrefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export function DeveloperTokenPanel() {
  const [tokens, setTokens] = useState<DeveloperToken[]>([]);
  const [name, setName] = useState("VS Code");
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadInitialTokens() {
      try {
        const res = await fetch("/api/developer-tokens");
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load developer tokens");
        }

        if (!ignore) {
          setTokens(data.tokens);
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Something went wrong");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadInitialTokens();

    return () => {
      ignore = true;
    };
  }, []);

  function connectVsCode() {
    setConnecting(true);
    setError("");

    const params = new URLSearchParams({
      name,
      redirect: "vscode://nexus-ai.nexus-ai-vscode/connect",
    });

    window.location.assign(`/api/developer-tokens/vscode-callback?${params}`);
  }

  async function revokeToken(tokenId: string) {
    const confirmed = window.confirm("Revoke this developer token?");

    if (!confirmed) return;

    const res = await fetch(`/api/developer-tokens/${tokenId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setTokens((current) =>
        current.map((token) =>
          token.id === tokenId
            ? {
                ...token,
                revokedAt: new Date().toISOString(),
              }
            : token
        )
      );
    }
  }

  return (
    <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-300">
            <Code2 className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-black text-white">Developer tokens</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
            Connect Nexus AI to VS Code without copying tokens. The browser opens
            VS Code, and the extension stores the developer token securely.
          </p>
        </div>

        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
            Token name
          </label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
          />
          <button
            type="button"
            onClick={connectVsCode}
            disabled={connecting || name.trim().length < 2}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {connecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            {connecting ? "Opening VS Code..." : "Connect VS Code"}
          </button>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Approve the browser prompt to open VS Code. No manual copy or paste is
            needed.
          </p>
        </div>
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-slate-500">
            <tr className="border-b border-white/10">
              <th className="py-3 pr-4 font-semibold">Name</th>
              <th className="py-3 pr-4 font-semibold">Prefix</th>
              <th className="py-3 pr-4 font-semibold">Created</th>
              <th className="py-3 pr-4 font-semibold">Last used</th>
              <th className="py-3 pr-4 font-semibold">Status</th>
              <th className="py-3 pr-4 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  Loading developer tokens...
                </td>
              </tr>
            ) : tokens.length > 0 ? (
              tokens.map((token) => (
                <tr key={token.id} className="border-b border-white/5 text-slate-300">
                  <td className="py-4 pr-4 font-bold text-white">{token.name}</td>
                  <td className="py-4 pr-4">
                    <code className="rounded-lg bg-white/5 px-2 py-1 text-xs text-slate-400">
                      {token.tokenPrefix}...
                    </code>
                  </td>
                  <td className="py-4 pr-4">{formatDate(token.createdAt)}</td>
                  <td className="py-4 pr-4">{formatDate(token.lastUsedAt)}</td>
                  <td className="py-4 pr-4">
                    {token.revokedAt ? (
                      <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-black text-red-300">
                        Revoked
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-black text-emerald-300">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="py-4 pr-4">
                    <button
                      type="button"
                      onClick={() => revokeToken(token.id)}
                      disabled={Boolean(token.revokedAt)}
                      className="inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Revoke
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  No developer tokens yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
