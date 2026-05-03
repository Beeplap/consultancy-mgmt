"use client";

import { ChevronDown } from "lucide-react";
import { Fragment, useState } from "react";
import { IntakeBadge } from "@/components/ui/badge";
import type { IntakeStatus, IntakeName } from "@/lib/database.types";

export type MatchCourseRowSerialized = {
  courseId: string;
  universityName: string | null;
  universityLocation: string | null;
  universityDescription: string | null;
  courseName: string | null;
  subtitle: string;
  courseDescription: string | null;
  minGpa: number | null;
  minIelts: number | null;
  waiver: string;
  fee: string;
  gap: string;
  cas: string;
  scholarship: string;
  intakeEntries: Array<{ id: string; intake: IntakeName; status: IntakeStatus; score: number | null }>;
  matchScore: number | null;
  ranMatch: boolean;
};

export function MatchCourseRows({
  rows,
  emptyMessage,
}: {
  rows: MatchCourseRowSerialized[];
  emptyMessage: string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
        return (
          <Fragment key={row.courseId}>
            <tr className="hover:bg-zinc-50">
              <td className="px-2 py-3 align-top">
                <button
                  type="button"
                  onClick={() => setExpandedId((id) => (id === row.courseId ? null : row.courseId))}
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
                        <dt className="text-zinc-500">GPA / IELTS</dt>
                        <dd>
                          {row.minGpa ?? "—"} / {row.minIelts ?? "—"}
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
                      {row.universityDescription ? (
                        <section>
                          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                            About the university
                          </h4>
                          <div className="whitespace-pre-wrap rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-zinc-700">
                            {row.universityDescription}
                          </div>
                        </section>
                      ) : null}
                      {row.courseDescription ? (
                        <section>
                          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                            About this course
                          </h4>
                          <div className="whitespace-pre-wrap rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-zinc-700">
                            {row.courseDescription}
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
