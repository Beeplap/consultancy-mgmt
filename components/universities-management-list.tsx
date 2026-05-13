"use client";

import { useMemo, useState } from "react";
import { UniversityCourseSection } from "@/components/university-course-section";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import type { CourseWithIntakesRow } from "@/components/university-courses-table";
import type { UniversityEditPayload } from "@/components/university-edit-modal";

type UniversityManagementRow = UniversityEditPayload & {
  courses: CourseWithIntakesRow[];
};

type UniversitiesManagementListProps = {
  universities: UniversityManagementRow[];
};

function universityLabel(university: Pick<UniversityManagementRow, "name">) {
  return university.name?.trim() || "Unnamed university";
}

function matchesSearch(university: UniversityManagementRow, query: string) {
  const text = query.trim().toLowerCase();
  if (!text) return true;
  return [university.name, university.location, university.ranking != null ? String(university.ranking) : null]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(text);
}

export function UniversitiesManagementList({ universities }: UniversitiesManagementListProps) {
  const [selectedUniversityId, setSelectedUniversityId] = useState("");
  const [query, setQuery] = useState("");

  const filteredUniversities = useMemo(
    () =>
      universities.filter((university) => {
        const selectedMatches = !selectedUniversityId || university.id === selectedUniversityId;
        return selectedMatches && matchesSearch(university, query);
      }),
    [universities, selectedUniversityId, query],
  );

  return (
    <>
      <div className="grid gap-3 border-b border-zinc-200 bg-zinc-50/80 px-5 py-4 lg:grid-cols-[260px_1fr_auto] lg:items-end">
        <Field label="Show university">
          <Select value={selectedUniversityId} onChange={(event) => setSelectedUniversityId(event.currentTarget.value)}>
            <option value="">All universities</option>
            {universities.map((university) => (
              <option key={university.id} value={university.id}>
                {universityLabel(university)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Search university">
          <Input
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Type university name, city, or ranking..."
          />
        </Field>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setSelectedUniversityId("");
            setQuery("");
          }}
          disabled={!selectedUniversityId && !query}
        >
          Reset
        </Button>
      </div>

      {filteredUniversities.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-zinc-500">No universities match the current selection.</p>
      ) : (
        <div>
          {filteredUniversities.map((university) => (
            <UniversityCourseSection
              key={university.id}
              university={{
                id: university.id,
                name: university.name,
                location: university.location,
                ranking: university.ranking,
                description: university.description,
                photo_path: university.photo_path,
              }}
              courses={university.courses}
            />
          ))}
        </div>
      )}
    </>
  );
}
