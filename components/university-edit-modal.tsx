"use client";

import Image from "next/image";
import { useEffect, useRef, useTransition } from "react";
import { updateUniversityAction } from "@/lib/actions/universities";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { universityCoverAcceptAttr, universityCoverPublicUrl } from "@/lib/university-cover";

export type UniversityEditPayload = {
  id: string;
  name: string | null;
  location: string | null;
  ranking: number | null;
  description: string | null;
  photo_path: string | null;
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

  const previewUrl = universityCoverPublicUrl(university.photo_path);

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
          encType="multipart/form-data"
          method="post"
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
          <div className="grid gap-2">
            <span className="text-sm font-medium text-zinc-800">University photo (optional)</span>
            <p className="text-xs text-zinc-500">
              JPG, PNG, WebP, or GIF. Max <span className="font-medium text-zinc-700">2MB</span>. Stored in Supabase bucket{" "}
              <code className="rounded bg-zinc-100 px-1 py-px text-[11px]">university-covers</code>.
            </p>
            {previewUrl ? (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group mx-auto block max-w-full overflow-hidden rounded-lg border border-zinc-200"
              >
                <Image
                  src={previewUrl}
                  alt=""
                  width={640}
                  height={480}
                  sizes="(max-width: 512px) 100vw, 512px"
                  className="mx-auto max-h-40 max-w-full object-contain transition group-hover:opacity-95"
                />
                <span className="sr-only">Open current photo full size</span>
              </a>
            ) : null}
            <input
              name="universityCover"
              type="file"
              accept={universityCoverAcceptAttr()}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm hover:file:bg-zinc-200 focus:border-black focus:ring-2 focus:ring-zinc-200"
            />
            {previewUrl ? (
              <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-600">
                <input type="checkbox" name="removeUniversityCover" className="h-4 w-4 rounded border-zinc-300" />
                Remove current photo when saving
              </label>
            ) : null}
          </div>
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
