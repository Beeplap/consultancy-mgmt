"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { UniversityEditModal, type UniversityEditPayload } from "@/components/university-edit-modal";
import { UniversityRowActions } from "@/components/university-row-actions";

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
        <UniversityRowActions universityId={university.id} displayName={displayName} onEdit={() => setEditOpen(true)} />
      </div>
      {children}
      <UniversityEditModal open={editOpen} onOpenChange={setEditOpen} university={university} />
    </article>
  );
}
