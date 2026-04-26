import { StudentOnboardingWizard } from "./wizard";

export default function StudentOnboardingPage() {
  return (
    <main className="min-h-screen w-full bg-[#f2f2f2] px-6 py-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col justify-start">
        <StudentOnboardingWizard />
      </div>
    </main>
  );
}
