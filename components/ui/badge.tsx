import type { IntakeStatus, StudentStatus } from "@/lib/database.types";
import { titleCase } from "@/lib/format";

const statusClass: Record<StudentStatus, string> = {
  new: "border-zinc-300 bg-white text-zinc-700",
  applied: "border-zinc-300 bg-zinc-100 text-zinc-900",
  offer: "border-green-200 bg-green-50 text-green-700",
  visa: "border-green-300 bg-green-100 text-green-800",
  enrolled: "border-black bg-black text-white",
};

const intakeClass: Record<IntakeStatus, string> = {
  open: "border-green-200 bg-green-50 text-green-700",
  closing: "border-red-200 bg-red-50 text-red-700",
  closed: "border-zinc-300 bg-zinc-100 text-zinc-500",
};

export function StatusBadge({ status }: { status: StudentStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass[status]}`}>
      {titleCase(status)}
    </span>
  );
}

export function IntakeBadge({ status }: { status: IntakeStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${intakeClass[status]}`}>
      {titleCase(status)}
    </span>
  );
}
