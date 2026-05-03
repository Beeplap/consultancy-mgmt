"use client";

import { useEffect, useRef, useTransition } from "react";
import { updateUniversityAction } from "@/lib/actions/universities";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";

export type UniversityEditPayload = {
  id: string;
  name: string | null;
  location: string | null;
  ranking: number | null;
  description: string | null;
};

type UniversityEditModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  university: UniversityEditPayload;
};

export function UniversityEditModal({ open, onOpenChange, university }: UniversityEditModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveEl = useRef<HTMLElement | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    previousActiveEl.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onEscape);
    const id = requestAnimationFrame(() => dialogRef.current?.focus());
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener("keydown", onEscape);
      document.body.style.overflow = prevOverflow;
      previousActiveEl.current?.focus?.();
    };
  }, [open, onOpenChange]);

  function onBackdropPointerDown(event: React.MouseEvent | React.PointerEvent) {
    if (event.target === backdropRef.current) onOpenChange(false);
  }

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onPointerDown={onBackdropPointerDown}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-university-title"
        tabIndex={-1}
        className="max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto rounded-xl border border-zinc-200 bg-white p-6 shadow-xl"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="mb-6">
          <h2 id="edit-university-title" className="text-lg font-semibold text-zinc-900">
            Edit university
          </h2>
          <p className="mt-1 text-sm text-zinc-600">Changes apply to Match Student descriptions and listings.</p>
        </div>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startTransition(async () => {
              await updateUniversityAction(formData);
              onOpenChange(false);
            });
          }}
        >
          <input type="hidden" name="universityId" value={university.id} />
          <Field label="Name">
            <Input name="name" defaultValue={university.name ?? ""} />
          </Field>
          <Field label="UK city">
            <Input name="location" defaultValue={university.location ?? ""} />
          </Field>
          <Field label="Ranking">
            <Input name="ranking" type="number" min="1" defaultValue={university.ranking ?? ""} />
          </Field>
          <Field label="Description (optional)">
            <Textarea name="description" defaultValue={university.description ?? ""} rows={6} />
          </Field>
          <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-100 pt-4">
            <Button type="button" variant="secondary" disabled={pending} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
