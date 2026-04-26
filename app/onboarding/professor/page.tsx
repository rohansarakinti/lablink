import { ProfessorOnboardingWizard } from "./wizard";

export default function ProfessorOnboardingPage() {
  return (
    <main className="min-h-screen w-full bg-[#f2f2f2] px-6 py-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col justify-start">
        <ProfessorOnboardingWizard />
      </div>
    </main>
  );
}
