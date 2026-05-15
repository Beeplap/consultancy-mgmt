"use client";

import { ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { createPortal } from "react-dom";
import { IntakeBadge } from "@/components/ui/badge";
import type { IntakeStatus } from "@/lib/database.types";

type MatchCourseDetails = {
  universityDescription: string | null;
  courseDescription: string | null;
  universityPhotoUrls: string[];
};

type CourseDetailsState =
  | { status: "loading" }
  | { status: "loaded"; data: MatchCourseDetails }
  | { status: "error"; message: string };

export type MatchCourseRowSerialized = {
  courseId: string;
  universityName: string | null;
  universityLocation: string | null;
  courseName: string | null;
  subtitle: string;
  minGpa: string | null;
  minIelts: string | null;
  minPte: string | null;
  waiver: string;
  fee: string;
  gap: string;
  cas: string;
  scholarship: string;
  intakeEntries: Array<{ id: string; intake: string; status: IntakeStatus; score: number | null }>;
  matchScore: number | null;
  ranMatch: boolean;
};

function UniversityPhotoGallery({ urls, universityName }: { urls: string[]; universityName: string | null }) {
  const [index, setIndex] = useState(0);
  if (urls.length === 0) return null;

  const currentIndex = Math.min(index, urls.length - 1);
  const currentUrl = urls[currentIndex] ?? urls[0];
  if (!currentUrl) return null;
  const hasMultiple = urls.length > 1;

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">University photos</h4>
        {hasMultiple ? (
          <span className="text-xs text-zinc-500">
            {currentIndex + 1} / {urls.length}
          </span>
        ) : null}
      </div>
      <div className="mx-auto mb-2 max-w-md">
        <div className="relative overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
          <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="group block">
            <div className="relative h-56 w-full sm:h-72">
              <Image
                src={currentUrl}
                alt={universityName ? `${universityName} photo` : "University photo"}
                fill
                sizes="(max-width: 768px) 100vw, 448px"
                unoptimized={currentUrl.includes("/storage/v1/render/image/")}
                className="object-cover object-center transition group-hover:opacity-95"
              />
            </div>
            <span className="sr-only">Open selected university image full screen in new tab</span>
          </a>
          {hasMultiple ? (
            <>
              <button
                type="button"
                onClick={() => setIndex((value) => (value === 0 ? urls.length - 1 : value - 1))}
                className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-zinc-800 shadow hover:bg-white"
                aria-label="Previous university photo"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setIndex((value) => (value + 1) % urls.length)}
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-zinc-800 shadow hover:bg-white"
                aria-label="Next university photo"
              >
                <ChevronRight className="h-5 w-5" aria-hidden />
              </button>
            </>
          ) : null}
        </div>
      </div>
      <p className="text-[11px] text-zinc-500">Latest uploaded photo appears first. Click the photo to open it full size.</p>
    </section>
  );
}

export function MatchCourseRows({
  rows,
  emptyMessage,
}: {
  rows: MatchCourseRowSerialized[];
  emptyMessage: string;
}) {
  const [selectedRow, setSelectedRow] = useState<MatchCourseRowSerialized | null>(null);
  const [detailsByCourseId, setDetailsByCourseId] = useState<Record<string, CourseDetailsState>>({});

  async function loadCourseDetails(courseId: string) {
    if (detailsByCourseId[courseId]) return;

    setDetailsByCourseId((current) => ({ ...current, [courseId]: { status: "loading" } }));
    try {
      const response = await fetch(`/api/course-details/${courseId}`);
      if (!response.ok) throw new Error("Could not load course details.");
      const data = (await response.json()) as MatchCourseDetails;
      setDetailsByCourseId((current) => ({ ...current, [courseId]: { status: "loaded", data } }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not load course details.";
      setDetailsByCourseId((current) => ({ ...current, [courseId]: { status: "error", message } }));
    }
  }

  function openDetails(row: MatchCourseRowSerialized) {
    setSelectedRow(row);
    void loadCourseDetails(row.courseId);
  }

  if (rows.length === 0) {
    return (
      <tbody className="divide-y divide-zinc-100">
        <tr>
          <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
            {emptyMessage}
          </td>
        </tr>
      </tbody>
    );
  }

  return (
    <>
      <tbody className="divide-y divide-zinc-100">
        {rows.map((row) => (
          <tr
            key={row.courseId}
            onClick={() => openDetails(row)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openDetails(row);
              }
            }}
            tabIndex={0}
            className="cursor-pointer hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-zinc-900"
            aria-label={`Open details for ${row.courseName ?? "course"}`}
          >
            <td className="px-2 py-3 align-top">
              <button
                type="button"
                tabIndex={-1}
                onClick={(event) => {
                  event.stopPropagation();
                  openDetails(row);
                }}
                className="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                aria-label="Open course details"
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
              </button>
            </td>
            <td className="px-4 py-3 align-top">
              <p className="font-medium">{row.universityName ?? "-"}</p>
              <p className="text-xs text-zinc-500">{row.universityLocation ?? ""}</p>
            </td>
            <td className="px-4 py-3 align-top">
              <p>{row.courseName ?? "-"}</p>
              <p className="text-xs text-zinc-500">{row.subtitle}</p>
            </td>
            <td className="px-4 py-3 align-top">
              GPA {row.minGpa ?? "-"}
              <br />
              IELTS {row.minIelts ?? "-"}
              <br />
              PTE {row.minPte ?? "-"}
            </td>
            <td className="px-4 py-3 align-top">{row.waiver}</td>
            <td className="px-4 py-3 align-top">{row.fee}</td>
            <td className="px-4 py-3 align-top">
              <div className="flex flex-wrap gap-2">
                {row.intakeEntries.map(({ id, intake, status }) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1"
                  >
                    <span className="text-xs font-medium">{intake}</span>
                    <IntakeBadge status={status} />
                  </span>
                ))}
              </div>
            </td>
            <td className="px-4 py-3 align-top">
              {row.matchScore != null ? (
                <span className={row.matchScore >= 80 ? "font-semibold text-green-700" : "font-semibold text-zinc-900"}>
                  {row.matchScore}%
                </span>
              ) : (
                <span className="text-zinc-400">-</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
      {selectedRow
        ? createPortal(
            <CourseDetailsModal
              row={selectedRow}
              detailsState={detailsByCourseId[selectedRow.courseId]}
              onClose={() => setSelectedRow(null)}
            />,
            document.body,
          )
        : null}
    </>
  );
}

function CourseDetailsModal({
  row,
  detailsState,
  onClose,
}: {
  row: MatchCourseRowSerialized;
  detailsState: CourseDetailsState | undefined;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/45 px-3 py-4 sm:px-6" role="dialog" aria-modal="true">
      <div className="mx-auto flex max-h-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-500">{row.universityName ?? "University"}</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-zinc-950">{row.courseName ?? "Course details"}</h2>
            <p className="mt-1 text-sm text-zinc-600">{row.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Close course details"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5">
          {detailsState?.status === "loading" ? (
            <div className="mb-4 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500">
              Loading details...
            </div>
          ) : null}
          {detailsState?.status === "error" ? (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {detailsState.message}
            </div>
          ) : null}

          <div className="grid gap-6 text-sm text-zinc-800 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)]">
            <dl className="grid content-start gap-3">
              <Detail label="University" value={row.universityName ?? "-"} strong />
              <Detail label="Location" value={row.universityLocation ?? "-"} />
              <Detail label="Course" value={row.courseName ?? "-"} strong />
              <Detail label="Programme" value={row.subtitle} />
              <Detail label="GPA / IELTS / PTE" value={`${row.minGpa ?? "-"} / ${row.minIelts ?? "-"} / ${row.minPte ?? "-"}`} />
              <Detail label="IELTS waiver" value={row.waiver} />
              <Detail label="Fee" value={row.fee} />
              <Detail label="Accepted gap" value={row.gap} />
              <Detail label="CAS deposit" value={row.cas} />
              <Detail label="Scholarship" value={row.scholarship} />
              <div className="grid grid-cols-[minmax(0,8rem)_1fr] gap-x-3 gap-y-1 pb-1">
                <dt className="text-zinc-500">Intakes</dt>
                <dd>
                  <ul className="flex flex-col gap-2">
                    {row.intakeEntries.map(({ id, intake, status, score }) => (
                      <li key={id} className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2 py-1">
                          <span className="text-xs font-medium">{intake}</span>
                          <IntakeBadge status={status} />
                        </span>
                        {row.ranMatch && score != null ? <span className="text-xs text-zinc-600">Match {score}%</span> : null}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
              {row.matchScore != null ? <Detail label="Best match" value={`${row.matchScore}%`} strong /> : null}
            </dl>

            <div className="space-y-5">
              {detailsState?.status === "loaded" ? (
                <UniversityPhotoGallery urls={detailsState.data.universityPhotoUrls} universityName={row.universityName} />
              ) : null}
              {detailsState?.status === "loaded" && detailsState.data.universityDescription ? (
                <TextPanel title="About the university" body={detailsState.data.universityDescription} />
              ) : null}
              {detailsState?.status === "loaded" && detailsState.data.courseDescription ? (
                <TextPanel title="About this course" body={detailsState.data.courseDescription} />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="grid grid-cols-[minmax(0,8rem)_1fr] gap-x-3 gap-y-1 border-b border-zinc-100 pb-2">
      <dt className="text-zinc-500">{label}</dt>
      <dd className={strong ? "font-medium" : undefined}>{value}</dd>
    </div>
  );
}

function TextPanel({ title, body }: { title: string; body: string }) {
  return (
    <section>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</h4>
      <div className="whitespace-pre-wrap rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-zinc-700">
        {body}
      </div>
    </section>
  );
}
