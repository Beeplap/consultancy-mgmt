import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <section className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">UK Education Counselling</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Admin login</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">Use an admin or counsellor account to access protected student and university workflows.</p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
