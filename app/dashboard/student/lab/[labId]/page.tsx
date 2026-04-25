import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LabFeedPostCard } from "@/components/lab/lab-feed-post-card";
import { ArrowLeft, MapPin, Sparkles } from "lucide-react";

type ProfileSnippet = { display_name: string | null; avatar_url: string | null };

type LabPostRow = {
  id: string;
  caption: string;
  media: { url: string; type: string; alt?: string }[];
  created_at: string;
  author_id: string;
  profiles: ProfileSnippet | ProfileSnippet[] | null;
};

function normalizeProfile(p: LabPostRow["profiles"]): ProfileSnippet | null {
  if (!p) return null;
  return Array.isArray(p) ? p[0] ?? null : p;
}

type PostingRow = {
  id: string;
  title: string;
  is_paid: string | null;
  hours_per_week: string | null;
  application_deadline: string | null;
  created_at: string;
};

export default async function StudentLabProfilePage({ params }: { params: Promise<{ labId: string }> }) {
  const { labId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/sign-in?role=student");
  }

  const { data: lab } = await supabase
    .from("lab_groups")
    .select(
      "id,name,university,department,tagline,description,website_url,logo_url,banner_url,research_fields,research_tags,gallery_urls,student_fit,expectations",
    )
    .eq("id", labId)
    .maybeSingle<{
      id: string;
      name: string;
      university: string;
      department: string | null;
      tagline: string | null;
      description: string | null;
      website_url: string | null;
      logo_url: string | null;
      banner_url: string | null;
      research_fields: string[];
      research_tags: string[];
      gallery_urls: string[];
      student_fit: string | null;
      expectations: string | null;
    }>();

  if (!lab) {
    notFound();
  }

  const [{ data: postings }, { data: postRows, error: postsError }] = await Promise.all([
    supabase
      .from("role_postings")
      .select("id,title,is_paid,hours_per_week,application_deadline,created_at")
      .eq("lab_id", labId)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .returns<PostingRow[]>(),
    supabase
      .from("lab_posts")
      .select("id,caption,media,created_at,author_id,profiles(display_name,avatar_url)")
      .eq("lab_id", labId)
      .order("created_at", { ascending: false })
      .limit(30)
      .returns<LabPostRow[]>(),
  ]);

  const openPostings = postings ?? [];
  const feedPosts = postRows ?? [];

  return (
    <div className="w-full max-w-6xl">
      <Link
        href="/dashboard/student"
        className="ll-animate-fade-up mb-6 inline-flex items-center gap-2 text-sm font-medium text-ll-navy transition-transform duration-200 hover:-translate-x-0.5 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to Explore
      </Link>

      <div className="ll-animate-scale-in ll-delay-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {lab.banner_url ? (
          <div className="relative h-40 w-full bg-zinc-100 md:h-48">
            <Image src={lab.banner_url} alt="" fill className="object-cover" unoptimized />
          </div>
        ) : null}
        <div className="p-6 md:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 sm:h-24 sm:w-24">
              {lab.logo_url ? (
                <Image src={lab.logo_url} alt="" fill className="object-cover" unoptimized />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-zinc-500">
                  {lab.name.slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-bold tracking-tight text-ll-navy sm:text-4xl">{lab.name}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-zinc-600">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                <span>
                  {lab.university}
                  {lab.department ? ` · ${lab.department}` : ""}
                </span>
              </p>
              {lab.tagline ? <p className="mt-3 text-sm font-medium text-zinc-800">{lab.tagline}</p> : null}
            </div>
          </div>

          {lab.research_fields.length > 0 || lab.research_tags.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {lab.research_fields.map((f) => (
                <span
                  key={f}
                  className="inline-flex items-center rounded-full border border-ll-purple/20 bg-ll-bg px-2.5 py-0.5 text-xs font-medium text-ll-navy"
                >
                  {f}
                </span>
              ))}
              {lab.research_tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs text-zinc-700"
                >
                  {t}
                </span>
              ))}
            </div>
          ) : null}

          {lab.description ? <p className="mt-6 text-sm leading-relaxed text-zinc-700 whitespace-pre-wrap">{lab.description}</p> : null}

          {lab.gallery_urls.length > 0 ? (
            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {lab.gallery_urls.slice(0, 8).map((url) => (
                <div key={url} className="relative h-24 w-full overflow-hidden rounded-lg bg-zinc-100">
                  <Image src={url} alt="" fill className="object-cover" unoptimized />
                </div>
              ))}
            </div>
          ) : null}

          {lab.student_fit || lab.expectations ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Who should apply</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">
                  {lab.student_fit || "No specific fit guidance provided yet."}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Expectations</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">
                  {lab.expectations || "No weekly expectations provided yet."}
                </p>
              </div>
            </div>
          ) : null}

          {lab.website_url ? (
            <a
              href={lab.website_url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block text-sm font-semibold text-ll-navy underline"
            >
              Lab website
            </a>
          ) : null}
        </div>
      </div>

      <section className="ll-animate-fade-up ll-delay-200 mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ll-navy">Open role postings</h2>
        <p className="mt-1 text-sm text-zinc-600">Active listings from this lab. Apply to join their team.</p>

        {openPostings.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-600">
            No open roles right now. Follow their feed for updates, or check back later.
          </div>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {openPostings.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/postings/${p.id}`}
                  className="block rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-all duration-250 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <h3 className="font-semibold text-ll-navy">{p.title}</h3>
                  <p className="mt-2 text-xs text-zinc-600">
                    {[p.is_paid ? (p.is_paid === "yes" ? "Paid" : p.is_paid === "no" ? "Unpaid" : p.is_paid) : null, p.hours_per_week ? `${p.hours_per_week} h/wk` : null]
                      .filter(Boolean)
                      .join(" · ") || "View details"}
                  </p>
                  {p.application_deadline ? (
                    <p className="mt-1 text-xs text-zinc-500">Deadline: {new Date(p.application_deadline).toLocaleDateString()}</p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="ll-animate-fade-up ll-delay-300 mt-10">
        <h2 className="group flex items-center gap-2 text-lg font-bold text-ll-navy">
          <Sparkles className="size-5 text-ll-purple transition-transform duration-300 group-hover:rotate-6" aria-hidden />
          Lab feed
        </h2>
        <p className="mt-1 text-sm text-zinc-600">Public updates from the lab team.</p>

        {postsError ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">Could not load feed posts.</p>
        ) : null}

        {!postsError && feedPosts.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-600">
            No posts yet.
          </div>
        ) : null}

        {!postsError && feedPosts.length > 0 ? (
          <ul className="mt-4 flex flex-row flex-wrap items-start justify-start gap-x-4 gap-y-6">
            {feedPosts.map((post) => {
              const author = normalizeProfile(post.profiles);
              return (
                <li
                  key={post.id}
                  className="w-full max-w-[16.5rem] shrink-0 sm:w-[17.25rem] sm:max-w-none"
                >
                  <LabFeedPostCard
                    labName={lab.name}
                    labLogoUrl={lab.logo_url}
                    authorDisplayName={author?.display_name ?? null}
                    authorAvatarUrl={author?.avatar_url ?? null}
                    caption={post.caption}
                    media={Array.isArray(post.media) ? post.media : []}
                    createdAt={post.created_at}
                    compact
                  />
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
