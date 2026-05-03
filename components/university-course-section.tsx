"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { deleteUniversityAction } from "@/lib/actions/universities";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { UniversityEditModal, type UniversityEditPayload } from "@/components/university-edit-modal";

type UniversityCourseSectionProps = {
  university: UniversityEditPayload;
  children: ReactNode;
};

export function UniversityCourseSection({ university, children }: UniversityCourseSectionProps) {
  const [editOpen, setEditOpen] = useState(false);
  const displayName = university.name?.trim() || "Unnamed university";

  return (
    <article className="border-b border-zinc-100 px-5 py-5 last:border-b-0">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{displayName}</h3>
          <p className="text-sm text-zinc-500">
            {[university.location, university.ranking != null ? `Ranking ${university.ranking}` : null].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" className="h-9 shrink-0" onClick={() => setEditOpen(true)}>
            Edit
          </Button>
          <form action={deleteUniversityAction} className="inline">
            <input type="hidden" name="universityId" value={university.id} />
            <ConfirmSubmitButton
              message={`Delete ${displayName} and all of its courses?`}
              className="h-9 shrink-0 px-4"
            >
              Delete
            </ConfirmSubmitButton>
          </form>
        </div>
      </div>
      {children}
      <UniversityEditModal open={editOpen} onOpenChange={setEditOpen} university={university} />
    </article>
  );
}
