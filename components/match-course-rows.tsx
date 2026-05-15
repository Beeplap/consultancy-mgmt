"use client";

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { Fragment, useState } from "react";
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
      <p className="text-[11px] text-zinc-500">Click the photo to open it full size in a new tab.</p>
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
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

  function toggleExpanded(courseId: string) {
    const shouldOpen = expandedId !== courseId;
    setExpandedId(shouldOpen ? courseId : null);
    if (shouldOpen) void loadCourseDetails(courseId);
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
    <tbody className="divide-y divide-zinc-100">
      {rows.map((row) => {
        const open = expandedId === row.courseId;
        const detailsState = detailsByCourseId[row.courseId];
        return (
          <Fragment key={row.courseId}>
            <tr className="hover:bg-zinc-50">
              <td className="px-2 py-3 align-top">
                <button
                  type="button"
                  onClick={() => toggleExpanded(row.courseId)}
                  className="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  aria-expanded={open}
                  aria-label={open ? "Hide full course details" : "Show full course details"}
                >
                  <ChevronDown
                    className={`h-5 w-5 transition-transform ${open ? "rotate-180" : ""}`}
                    aria-hidden
                  />
                </button>
              </td>
              <td className="px-4 py-3 align-top">
                <p className="font-medium">{row.universityName ?? "—"}</p>
                <p className="text-xs text-zinc-500">{row.universityLocation ?? ""}</p>
              </td>
              <td className="px-4 py-3 align-top">
                <p>{row.courseName ?? "—"}</p>
                <p className="text-xs text-zinc-500">{row.subtitle}</p>
              </td>
              <td className="px-4 py-3 align-top">
                GPA {row.minGpa ?? "—"}
                <br />
                IELTS {row.minIelts ?? "—"}
                <br />
                PTE {row.minPte ?? "—"}
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
                  <span
                    className={row.matchScore >= 80 ? "font-semibold text-green-700" : "font-semibold text-zinc-900"}
                  >
                    {row.matchScore}%
                  </span>
                ) : (
                  <span className="text-zinc-400">—</span>
                )}
              </td>
            </tr>
            {open ? (
              <tr className="border-t border-zinc-100 bg-zinc-50/80">
                <td colSpan={8} className="px-4 py-5">
                  {detailsState?.status === "loading" ? (
                    <div className="mb-4 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-500">
                      Loading details...
                    </div>
                  ) : null}
                  {detailsState?.status === "error" ? (
                    <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {detailsState.message}
                    </div>
                  ) : null}
                  <div className="grid gap-6 text-sm text-zinc-800 md:grid-cols-2">
                    <dl className="grid gap-3">
                      <div className="grid grid-cols-[minmax(0,8rem)_1fr] gap-x-3 gap-y-1 border-b border-zinc-100 pb-2">
                        <dt className="text-zinc-500">University</dt>
                        <dd className="font-medium">{row.universityName ?? "—"}</dd>
                      </div>
                      <div className="grid grid-cols-[minmax(0,8rem)_1fr] gap-x-3 gap-y-1 border-b border-zinc-100 pb-2">
                        <dt className="text-zinc-500">Location</dt>
                        <dd>{row.universityLocation ?? "—"}</dd>
                      </div>
                      <div className="grid grid-cols-[minmax(0,8rem)_1fr] gap-x-3 gap-y-1 border-b border-zinc-100 pb-2">
                        <dt className="text-zinc-500">Course</dt>
                        <dd className="font-medium">{row.courseName ?? "—"}</dd>
                      </div>
                      <div className="grid grid-cols-[minmax(0,8rem)_1fr] gap-x-3 gap-y-1 border-b border-zinc-100 pb-2">
                        <dt className="text-zinc-500">Programme</dt>
                        <dd>{row.subtitle}</dd>
                      </div>
                      <div className="grid grid-cols-[minmax(0,8rem)_1fr] gap-x-3 gap-y-1 border-b border-zinc-100 pb-2">
                        <dt className="text-zinc-500">GPA / IELTS / PTE</dt>
                        <dd>
                          {row.minGpa ?? "—"} / {row.minIelts ?? "—"} / {row.minPte ?? "—"}
                        </dd>
                      </div>
                      <div className="grid grid-cols-[minmax(0,8rem)_1fr] gap-x-3 gap-y-1 border-b border-zinc-100 pb-2">
                        <dt className="text-zinc-500">IELTS waiver</dt>
                        <dd>{row.waiver}</dd>
                      </div>
                      <div className="grid grid-cols-[minmax(0,8rem)_1fr] gap-x-3 gap-y-1 border-b border-zinc-100 pb-2">
                        <dt className="text-zinc-500">Fee</dt>
                        <dd>{row.fee}</dd>
                      </div>
                      <div className="grid grid-cols-[minmax(0,8rem)_1fr] gap-x-3 gap-y-1 border-b border-zinc-100 pb-2">
                        <dt className="text-zinc-500">Accepted gap</dt>
                        <dd>{row.gap}</dd>
                      </div>
                      <div className="grid grid-cols-[minmax(0,8rem)_1fr] gap-x-3 gap-y-1 border-b border-zinc-100 pb-2">
                        <dt className="text-zinc-500">CAS deposit</dt>
                        <dd>{row.cas}</dd>
                      </div>
                      <div className="grid grid-cols-[minmax(0,8rem)_1fr] gap-x-3 gap-y-1 border-b border-zinc-100 pb-2">
                        <dt className="text-zinc-500">Scholarship</dt>
                        <dd>{row.scholarship}</dd>
                      </div>
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
                                {row.ranMatch && score != null ? (
                                  <span className="text-xs text-zinc-600">Match {score}%</span>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        </dd>
                      </div>
                      {row.matchScore != null ? (
                        <div className="grid grid-cols-[minmax(0,8rem)_1fr] gap-x-3 gap-y-1 pt-1">
                          <dt className="text-zinc-500">Best match</dt>
                          <dd className="font-semibold">{row.matchScore}%</dd>
                        </div>
                      ) : null}
                    </dl>
                    <div className="space-y-5">
                      {detailsState?.status === "loaded" ? (
                        <UniversityPhotoGallery
                          urls={detailsState.data.universityPhotoUrls}
                          universityName={row.universityName}
                        />
                      ) : null}
                      {false ? (
                        <section>
                          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                            University photo
                          </h4>
                          <a
                            href=""
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group mx-auto mb-2 block max-w-md overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm"
                          >
                            <div className="relative h-56 w-full sm:h-72">
                              <Image
                                src=""
                                alt={
                                  row.universityName
                                    ? `${row.universityName} — cover photo`
                                    : "University cover photo"
                                }
                                fill
                                sizes="(max-width: 768px) 100vw, 448px"
                                className="object-cover object-center transition group-hover:opacity-95"
                              />
                            </div>
                            <span className="sr-only">Open university image full screen in new tab</span>
                          </a>
                          <p className="text-[11px] text-zinc-500">
                            Opens the full-size image in a new tab ({row.universityName ?? "university"}).
                          </p>
                        </section>
                      ) : null}
                      {detailsState?.status === "loaded" && detailsState.data.universityDescription ? (
                        <section>
                          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                            About the university
                          </h4>
                          <div className="whitespace-pre-wrap rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-zinc-700">
                            {detailsState.data.universityDescription}
                          </div>
                        </section>
                      ) : null}
                      {detailsState?.status === "loaded" && detailsState.data.courseDescription ? (
                        <section>
                          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                            About this course
                          </h4>
                          <div className="whitespace-pre-wrap rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-zinc-700">
                            {detailsState.data.courseDescription}
                          </div>
                        </section>
                      ) : null}
                    </div>
                  </div>
                </td>
              </tr>
            ) : null}
          </Fragment>
        );
      })}
    </tbody>
  );
}
