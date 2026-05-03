"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { MoreVertical } from "lucide-react";
import { deleteCourseAction } from "@/lib/actions/universities";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import type { Course } from "@/lib/database.types";

const MENU_W = 176;

export function CourseRowActions({ course }: { course: Course }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const left = Math.min(Math.max(8, r.right - MENU_W), window.innerWidth - MENU_W - 8);
    const top = Math.min(r.bottom + 4, window.innerHeight - 120);
    setCoords({ top, left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => setOpen(false);
    const onResize = () => setOpen(false);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Course actions"
      >
        <MoreVertical size={18} aria-hidden />
      </button>
      {mounted && open
        ? createPortal(
            <>
              <button
                type="button"
                className="fixed inset-0 z-[100] cursor-default bg-transparent"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
              />
              <div
                role="menu"
                className="fixed z-[110] w-44 rounded-lg border border-zinc-200 bg-white p-2 shadow-lg"
                style={{ top: coords.top, left: coords.left }}
              >
                <Link
                  href={`/dashboard/admin/universities/courses/${course.id}/edit`}
                  role="menuitem"
                  className="flex w-full items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-black hover:bg-zinc-50"
                  onClick={() => setOpen(false)}
                >
                  Edit
                </Link>
                <form action={deleteCourseAction} className="mt-1" role="none">
                  <input type="hidden" name="courseId" value={course.id} />
                  <ConfirmSubmitButton
                    message={`Delete ${course.name ?? "this course"}?`}
                    className="h-auto w-full justify-center py-2"
                  >
                    Delete
                  </ConfirmSubmitButton>
                </form>
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  );
}
