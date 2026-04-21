import { StudentOnboardingWizard } from "./wizard";

export default function StudentOnboardingPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-start px-6 py-8">
      <StudentOnboardingWizard />
    </main>
  );
}
