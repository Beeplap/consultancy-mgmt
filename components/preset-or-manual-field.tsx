"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/field";
import { groupByLetter } from "@/lib/course-form-presets";

function findPresetMatch(options: readonly string[], raw: string | null | undefined) {
  const t = (raw ?? "").trim().toLowerCase();
  if (!t) return undefined;
  return options.find((o) => o.trim().toLowerCase() === t);
}

export type PresetOrManualFieldProps = {
  name: string;
  label: string;
  options: readonly string[];
  defaultValue?: string | null;
  placeholderManual?: string;
  placeholderPreset?: string;
};

/** Preset picker with A–Z sections + letter jump (search typing or letter bar), plus “Add manually”. */
export function PresetOrManualField({
  name,
  label,
  options,
  defaultValue,
  placeholderManual = "Type value…",
  placeholderPreset = "Search or scroll the list…",
}: PresetOrManualFieldProps) {
  const id = useId();
  const listboxId = `${id}-listbox`;
  const initialTrim = defaultValue?.trim() ?? "";
  const initialMatch = findPresetMatch(options, initialTrim);
  const notInPreset = Boolean(initialTrim && !initialMatch);

  const [manual, setManual] = useState(notInPreset);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [presetChosen, setPresetChosen] = useState(notInPreset ? "" : (initialMatch ?? initialTrim));
  const [manualKey, bumpManualKey] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const letterAnchorsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...options];
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const grouped = useMemo(() => groupByLetter(filteredOptions), [filteredOptions]);
  const letters = useMemo(() => {
    const keys = [...grouped.keys()];
    return keys.sort((a, b) => {
      if (a === "#") return 1;
      if (b === "#") return -1;
      return a.localeCompare(b);
    });
  }, [grouped]);

  const scrollToLetter = useCallback((letter: string) => {
    const el = letterAnchorsRef.current.get(letter);
    el?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, []);

  const prevLenRef = useRef(query.length);
  useLayoutEffect(() => {
    if (manual || !open) return;
    if (query.length === 1 && prevLenRef.current === 0) {
      const ch = query.charAt(0).toUpperCase();
      if (/[A-Z]/.test(ch)) scrollToLetter(ch);
    }
    prevLenRef.current = query.length;
  }, [query, manual, open, scrollToLetter]);

  useEffect(() => {
    if (!open) return;
    const esc = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (rootRef.current && !rootRef.current.contains(t)) setOpen(false);
    };
    document.addEventListener("mousedown", esc);
    return () => document.removeEventListener("mousedown", esc);
  }, [open]);

  useEffect(() => {
    if (!open || manual) return;
    const handler = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement
      )
        return;
      if (/^[a-zA-Z]$/.test(e.key)) scrollToLetter(e.key.toUpperCase());
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, manual, scrollToLetter]);

  function setLetterAnchor(letter: string, el: HTMLDivElement | null) {
    if (!el) letterAnchorsRef.current.delete(letter);
    else letterAnchorsRef.current.set(letter, el);
  }

  function pick(value: string) {
    setPresetChosen(value);
    setOpen(false);
    setQuery("");
  }

  function toggleManual() {
    setManual((m) => {
      const next = !m;
      if (!m && next) {
        bumpManualKey((k) => k + 1);
        setOpen(false);
      }
      return next;
    });
    setQuery("");
  }

  return (
    <div ref={rootRef} className="grid gap-2">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-zinc-800">{label}</span>
        <button
          type="button"
          className="shrink-0 text-xs font-medium text-zinc-600 underline underline-offset-2 hover:text-black"
          onClick={toggleManual}
        >
          {manual ? "Pick from list" : "Add manually"}
        </button>
      </div>

      {manual ? (
        <Input
          key={`${manualKey}-${name}`}
          name={name}
          placeholder={placeholderManual}
          defaultValue={presetChosen || initialTrim}
        />
      ) : (
        <>
          <input type="hidden" name={name} value={presetChosen} aria-hidden />
          <div className="relative">
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-controls={listboxId}
              className="flex h-10 w-full items-center rounded-md border border-zinc-300 bg-white px-3 text-left text-sm outline-none transition placeholder:text-zinc-400 hover:border-zinc-400 focus:border-black focus:ring-2 focus:ring-zinc-200"
              onClick={() =>
                setOpen((o) => {
                  const next = !o;
                  if (next) {
                    setQuery("");
                    prevLenRef.current = 0;
                  }
                  return next;
                })
              }
            >
              <span className={presetChosen ? "text-zinc-900" : "text-zinc-400"}>{presetChosen || placeholderPreset}</span>
            </button>
            {open ? (
              <div
                id={listboxId}
                role="listbox"
                className="absolute left-0 right-0 z-40 mt-1 max-h-[min(22rem,calc(100vh-12rem))] overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg ring-1 ring-black/5"
              >
                <div className="border-b border-zinc-100 p-2">
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Type to filter, or tap a letter…"
                    className="h-9 text-sm"
                    autoFocus
                    aria-label={`Search ${label} presets`}
                  />
                </div>
                {letters.length > 1 ? (
                  <div className="flex gap-1 overflow-x-auto border-b border-zinc-100 bg-zinc-50 px-2 py-1.5 text-xs [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300">
                    {letters.map((L) => (
                      <button
                        key={L}
                        type="button"
                        className={`shrink-0 rounded px-2 py-0.5 font-medium text-zinc-700 hover:bg-white hover:text-black ${
                          L === "#" ? "tabular-nums" : ""
                        }`}
                        title={`Jump to ${L}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => scrollToLetter(L)}
                      >
                        {L}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div role="presentation" className="max-h-56 overflow-y-auto overscroll-contain px-2 py-2">
                  {letters.length === 0 ? (
                    <p className="px-1 py-3 text-center text-sm text-zinc-500">No matches.</p>
                  ) : (
                    letters.map((L) => (
                      <div
                        key={L}
                        ref={(el) => setLetterAnchor(L, el)}
                        className="mb-3 last:mb-0"
                      >
                        <div className="sticky top-0 z-10 -mx-1 bg-white/95 px-1 py-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 backdrop-blur-sm">
                          {L === "#" ? "Other" : L}
                        </div>
                        <ul className="mt-1 grid gap-0.5" role="group" aria-label={`Starts with ${L}`}>
                          {(grouped.get(L) ?? []).map((option) => (
                            <li key={option} role="presentation">
                              <button
                                type="button"
                                role="option"
                                aria-selected={presetChosen === option}
                                className="w-full rounded px-2 py-1.5 text-left text-sm text-zinc-800 hover:bg-zinc-100"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => pick(option)}
                              >
                                {option}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
