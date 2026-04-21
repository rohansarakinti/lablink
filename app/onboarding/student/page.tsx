import { StudentOnboardingWizard } from "./wizard";

export default function StudentOnboardingPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-16">
      <h1 className="text-3xl font-semibold text-ll-navy">Student onboarding</h1>
      <p className="mt-3 text-sm text-ll-gray">
        Multi-step onboarding is now active. Your progress is saved in-session.
      </p>

      <StudentOnboardingWizard />
    </main>
  );
}
