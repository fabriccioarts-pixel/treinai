"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Ellipsis, History, Pencil, Search, SquarePen, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  deleteCoachConversationAction,
  listCoachConversationsAction,
  renameCoachConversationAction,
  type CoachConversationSummary,
} from "@/app/actions/ai-actions";
import { cn } from "@/lib/utils";

const TIME_ZONE = "America/Sao_Paulo";
const DAY_MS = 86_400_000;
const LONG_PRESS_MS = 500;
// Dedo que se mexe mais que isso está rolando a lista, não segurando o item
const LONG_PRESS_SLOP_PX = 10;

function dayKey(date: Date) {
  return date.toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
}

/** Grupos como no ChatGPT: Hoje, Ontem, 7 e 30 dias anteriores, depois por mês */
function groupLabel(iso: string, now: Date) {
  const days = Math.round(
    (Date.parse(`${dayKey(now)}T12:00:00Z`) - Date.parse(`${dayKey(new Date(iso))}T12:00:00Z`)) / DAY_MS,
  );
  if (days <= 0) return "Hoje";
  if (days === 1) return "Ontem";
  if (days <= 7) return "7 dias anteriores";
  if (days <= 30) return "30 dias anteriores";
  const date = new Date(iso);
  const sameYear = date.getFullYear() === now.getFullYear();
  const label = date.toLocaleDateString("pt-BR", {
    month: "long",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone: TIME_ZONE,
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function groupConversations(list: CoachConversationSummary[]) {
  const now = new Date();
  const groups: { label: string; items: CoachConversationSummary[] }[] = [];
  for (const c of list) {
    const label = groupLabel(c.updatedAt, now);
    const last = groups.at(-1);
    if (last?.label === label) last.items.push(c);
    else groups.push({ label, items: [c] });
  }
  return groups;
}

/** Botão de histórico do topo da tela do Théo + gaveta lateral no estilo do ChatGPT */
export function CoachHistorySheet() {
  const router = useRouter();
  const currentId = useSearchParams().get("c");
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<CoachConversationSummary[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; draft: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CoachConversationSummary | null>(null);
  const [loading, startLoading] = useTransition();
  const [deleting, startDeleting] = useTransition();
  const [, startRenaming] = useTransition();
  const press = useRef<{ timer: number; x: number; y: number; fired: boolean } | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming) renameInputRef.current?.select();
    // Só ao entrar no modo de renomear, não a cada letra digitada
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renaming?.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt-BR");
    const list = conversations ?? [];
    return q ? list.filter((c) => c.title.toLocaleLowerCase("pt-BR").includes(q)) : list;
  }, [conversations, query]);
  const groups = useMemo(() => groupConversations(filtered), [filtered]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    setMenuId(null);
    setRenaming(null);
    if (!next) return;
    setQuery("");
    setError(null);
    // Recarrega a cada abertura: a conversa atual pode ter acabado de ser criada
    startLoading(async () => {
      const result = await listCoachConversationsAction();
      if (result.error) setError(result.error);
      else setConversations(result.conversations ?? []);
    });
  }

  function commitRename() {
    if (!renaming) return;
    const { id, draft } = renaming;
    const title = draft.trim();
    const original = conversations?.find((c) => c.id === id)?.title;
    setRenaming(null);
    if (!title || title === original) return;

    setConversations((list) => list?.map((c) => (c.id === id ? { ...c, title } : c)) ?? null);
    startRenaming(async () => {
      const result = await renameCoachConversationAction(id, title);
      if (result.error) {
        setError(result.error);
        setConversations((list) => list?.map((c) => (c.id === id && original ? { ...c, title: original } : c)) ?? null);
      }
    });
  }

  function confirmDelete() {
    const target = deleteTarget;
    if (!target) return;
    startDeleting(async () => {
      const result = await deleteCoachConversationAction(target.id);
      setDeleteTarget(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      setConversations((list) => list?.filter((c) => c.id !== target.id) ?? null);
      if (target.id === currentId) {
        setOpen(false);
        router.push("/theo");
      }
    });
  }

  function startPress(id: string, e: React.PointerEvent) {
    if (e.pointerType === "mouse") return;
    const timer = window.setTimeout(() => {
      if (!press.current) return;
      press.current.fired = true;
      if ("vibrate" in navigator) navigator.vibrate(10);
      setMenuId(id);
    }, LONG_PRESS_MS);
    press.current = { timer, x: e.clientX, y: e.clientY, fired: false };
  }

  function movePress(e: React.PointerEvent) {
    const p = press.current;
    if (p && !p.fired && Math.hypot(e.clientX - p.x, e.clientY - p.y) > LONG_PRESS_SLOP_PX) cancelPress();
  }

  function cancelPress() {
    if (press.current && !press.current.fired) {
      clearTimeout(press.current.timer);
      press.current = null;
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => handleOpenChange(true)}
        aria-label="Histórico de conversas"
        className={buttonVariants({ variant: "ghost", size: "icon", className: "shrink-0" })}
      >
        <History className="h-5 w-5" />
      </button>

      {/* Abre do lado do botão que a chama (direita); o conteúdo segue a barra lateral do ChatGPT */}
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-[85vw] max-w-[20rem] gap-0 p-0 data-[side=right]:sm:max-w-[20rem]"
        >
          <SheetTitle className="sr-only">Conversas com o Théo</SheetTitle>
          <SheetDescription className="sr-only">Histórico de conversas salvas</SheetDescription>

          {/* Busca + nova conversa, como o topo da barra lateral do ChatGPT */}
          <div className="flex items-center gap-2 px-3 pt-[calc(env(safe-area-inset-top)+12px)] pb-2">
            <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full bg-muted px-3.5">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar"
                aria-label="Buscar conversas"
                className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
              />
            </label>
            <Link
              href="/theo"
              replace
              onClick={() => setOpen(false)}
              aria-label="Nova conversa"
              className={buttonVariants({ variant: "ghost", size: "icon", className: "shrink-0" })}
            >
              <SquarePen className="h-5 w-5" />
            </Link>
          </div>

          <nav aria-label="Conversas" className="min-h-0 flex-1 overflow-y-auto px-2 pb-[calc(env(safe-area-inset-bottom)+16px)]">
            <Link
              href="/theo"
              replace
              onClick={() => setOpen(false)}
              className="mt-1 flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/60"
            >
              <SquarePen className="h-4 w-4 text-muted-foreground" aria-hidden />
              Nova conversa
            </Link>

            {error && <p className="px-3 py-3 text-sm text-destructive">{error}</p>}

            {loading && conversations === null && (
              <div className="mt-5 space-y-2 px-3" aria-label="Carregando conversas">
                <Skeleton className="h-3 w-12" />
                {[70, 55, 80, 62].map((w) => (
                  <Skeleton key={w} className="h-4" style={{ width: `${w}%` }} />
                ))}
              </div>
            )}

            {conversations?.length === 0 && (
              <p className="px-3 py-6 text-sm text-muted-foreground">
                Suas conversas com o Théo aparecem aqui.
              </p>
            )}

            {conversations && conversations.length > 0 && groups.length === 0 && (
              <p className="px-3 py-6 text-sm text-muted-foreground">Nenhuma conversa com “{query.trim()}”.</p>
            )}

            {groups.map((group) => (
              <section key={group.label} className="mt-5">
                <h2 className="px-3 pb-1 text-xs font-semibold text-muted-foreground">{group.label}</h2>
                <ul>
                  {group.items.map((c) => {
                    const isCurrent = c.id === currentId;
                    const menuOpen = menuId === c.id;

                    if (renaming?.id === c.id) {
                      return (
                        <li key={c.id}>
                          <input
                            ref={renameInputRef}
                            value={renaming.draft}
                            onChange={(e) => setRenaming({ id: c.id, draft: e.target.value })}
                            onBlur={commitRename}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") e.currentTarget.blur();
                              if (e.key === "Escape") setRenaming(null);
                            }}
                            maxLength={80}
                            enterKeyHint="done"
                            aria-label="Novo nome da conversa"
                            className="h-10 w-full rounded-lg bg-muted px-3 text-base text-foreground outline-none ring-1 ring-ring"
                          />
                        </li>
                      );
                    }

                    return (
                      <li key={c.id} className="group/row relative">
                        <Link
                          href={`/theo?c=${c.id}`}
                          // Trocar de conversa não empilha histórico: o "voltar" do topo sai do chat
                          replace
                          aria-current={isCurrent ? "page" : undefined}
                          onClick={(e) => {
                            // Segurar o dedo abre o menu; o toque que solta não deve abrir a conversa
                            if (press.current?.fired) {
                              e.preventDefault();
                              press.current = null;
                              return;
                            }
                            setOpen(false);
                          }}
                          onPointerDown={(e) => startPress(c.id, e)}
                          onPointerMove={movePress}
                          onPointerUp={cancelPress}
                          onPointerCancel={cancelPress}
                          onContextMenu={(e) => e.preventDefault()}
                          className={cn(
                            "flex h-10 items-center rounded-lg pr-10 pl-3 text-sm text-foreground transition-colors select-none [-webkit-touch-callout:none] hover:bg-muted/60",
                            (isCurrent || menuOpen) && "bg-muted hover:bg-muted",
                          )}
                        >
                          <span className="truncate">{c.title}</span>
                        </Link>

                        <DropdownMenu open={menuOpen} onOpenChange={(next) => setMenuId(next ? c.id : null)}>
                          <DropdownMenuTrigger
                            aria-label={`Opções da conversa ${c.title}`}
                            className={cn(
                              "absolute top-1/2 right-1 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-opacity hover:text-foreground focus-visible:opacity-100",
                              isCurrent || menuOpen ? "opacity-100" : "opacity-0 group-hover/row:opacity-100",
                            )}
                          >
                            <Ellipsis className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" finalFocus={false} className="min-w-40">
                            <DropdownMenuItem onClick={() => setRenaming({ id: c.id, draft: c.title })}>
                              <Pencil />
                              Renomear
                            </DropdownMenuItem>
                            <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(c)}>
                              <Trash2 />
                              Apagar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(next) => !next && !deleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleteTarget?.title}” some do histórico. Os treinos que o Théo criou nela continuam no app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Apagando…" : "Apagar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
