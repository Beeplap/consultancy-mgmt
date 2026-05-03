import { ApplicationStatus, IntakeStatus } from "@prisma/client";
import { titleCase } from "@/lib/format";

const statusClass: Record<ApplicationStatus, string> = {
  NEW: "border-zinc-300 bg-white text-zinc-700",
  APPLIED: "border-zinc-300 bg-zinc-100 text-zinc-900",
  OFFER: "border-green-200 bg-green-50 text-green-700",
  VISA: "border-green-300 bg-green-100 text-green-800",
  ENROLLED: "border-black bg-black text-white",
};

const intakeClass: Record<IntakeStatus, string> = {
  OPEN: "border-green-200 bg-green-50 text-green-700",
  CLOSING_SOON: "border-red-200 bg-red-50 text-red-700",
  CLOSED: "border-zinc-300 bg-zinc-100 text-zinc-500",
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
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
