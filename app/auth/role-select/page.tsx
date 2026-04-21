import Link from "next/link";

const roles = [
  {
    key: "student",
    title: "Student",
    description: "Discover research opportunities and apply to labs.",
    icon: "🎓",
  },
  {
    key: "professor",
    title: "Professor / Lab",
    description: "Post roles, manage your lab group, and recruit students.",
    icon: "🔬",
  },
] as const;

export default function RoleSelectPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold text-ll-navy">Choose your role</h1>
        <p className="text-sm text-ll-gray">
          Select how you want to use LabLink.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {roles.map((role) => (
          <section
            key={role.key}
            className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
          >
            <p className="mb-3 text-2xl">{role.icon}</p>
            <h2 className="text-xl font-semibold text-ll-navy">{role.title}</h2>
            <p className="mt-2 text-sm text-ll-gray">{role.description}</p>
            <div className="mt-6 flex gap-3">
              <Link
                href={`/auth/sign-up?role=${role.key}`}
                className="rounded-full bg-ll-purple px-4 py-2 text-sm font-medium text-white"
              >
                Create account
              </Link>
              <Link
                href={`/auth/sign-in?role=${role.key}`}
                className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700"
              >
                Sign in
              </Link>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
