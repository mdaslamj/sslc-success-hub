import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Library, Loader2, Sparkles } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ResourceCard } from "@/components/resources/resource-card";
import {
  ResourceFilters,
  type ResourceFiltersValue,
} from "@/components/resources/resource-filters";
import {
  QuickAccess,
  type QuickAccessAction,
} from "@/components/resources/quick-access";
import { OfficialPortals } from "@/components/resources/official-portals";
import {
  useLibraryCategories,
  useLibraryResources,
} from "@/hooks/use-resources";
import { fetchSubjects, fetchChapters } from "@/integrations/firebase/services";
import type {
  LibraryCategory,
  LibraryResourceDoc,
} from "@/integrations/firebase/types";
import { DEFAULT_LIBRARY_CATEGORIES } from "@/lib/resource-seed";

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [
      { title: "Resources — VidyaPath Academic Library" },
      {
        name: "description",
        content:
          "Centralized library of Karnataka SSLC textbooks, previous year papers, notes, worksheets, videos, formulas and question banks.",
      },
    ],
  }),
  component: ResourcesPage,
});

type Tab = "all" | LibraryCategory;

function ResourcesPage() {
  const search = Route.useSearch() as {
    subjectId?: string;
    chapterId?: string;
    category?: LibraryCategory;
  };

  const [tab, setTab] = useState<Tab>(search.category ?? "all");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [filters, setFilters] = useState<ResourceFiltersValue>({
    q: "",
    subjectId: search.subjectId ?? "all",
    chapterId: search.chapterId ?? "all",
    language: "all",
  });

  const subjectsQ = useQuery({
    queryKey: ["subjects"],
    queryFn: fetchSubjects,
    staleTime: 10 * 60_000,
  });
  const chaptersQ = useQuery({
    queryKey: ["chapters-all", subjectsQ.data?.map((s) => s.id).join(",")],
    queryFn: async () => {
      if (!subjectsQ.data) return [];
      const all = await Promise.all(
        subjectsQ.data.map((s) => fetchChapters(s.id)),
      );
      return all.flat();
    },
    enabled: !!subjectsQ.data,
    staleTime: 10 * 60_000,
  });

  const resourcesQ = useLibraryResources({
    category: tab === "all" ? undefined : tab,
    subjectId: filters.subjectId === "all" ? undefined : filters.subjectId,
    chapterId: filters.chapterId === "all" ? undefined : filters.chapterId,
    language: filters.language === "all" ? undefined : filters.language,
    featured: featuredOnly || undefined,
  });
  const categoriesQ = useLibraryCategories();

  // Fall back to local defaults if Firestore is empty so the UI never shows
  // an empty tab strip on first install.
  const categories =
    categoriesQ.data && categoriesQ.data.length > 0
      ? categoriesQ.data
      : DEFAULT_LIBRARY_CATEGORIES;

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const rows = resourcesQ.data ?? [];
    if (!q) return rows;
    return rows.filter((r) => {
      return (
        r.title.toLowerCase().includes(q) ||
        r.titleKn?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [resourcesQ.data, filters.q]);

  const handleQuickAccess = (a: QuickAccessAction) => {
    if (a.featuredOnly) {
      setFeaturedOnly(true);
      setTab("all");
    } else if (a.category) {
      setFeaturedOnly(false);
      setTab(a.category);
    }
  };

  return (
    <DashboardLayout title="Resources">
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <header className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl gradient-brand text-brand-foreground shadow-glow">
              <Library className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-bold sm:text-2xl">
                Academic Library
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Textbooks, PYQs, notes, videos, formulas — everything for SSLC
                in one place.
              </p>
            </div>
          </div>
        </header>

        <section>
          <QuickAccess onSelect={handleQuickAccess} />
        </section>

        <section>
          <OfficialPortals />
        </section>

        <section>
          <ResourceFilters
            value={filters}
            onChange={setFilters}
            subjects={subjectsQ.data ?? []}
            chapters={chaptersQ.data ?? []}
          />
        </section>

        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <div className="-mx-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex h-auto w-auto gap-1 rounded-full bg-secondary/60 p-1">
              <TabsTrigger value="all" className="rounded-full px-3 text-xs">
                All
              </TabsTrigger>
              {categories.map((c) => (
                <TabsTrigger
                  key={c.id}
                  value={c.id}
                  className="rounded-full px-3 text-xs whitespace-nowrap"
                >
                  {c.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>

        {featuredOnly && (
          <div className="flex items-center gap-2 rounded-full border border-brand/40 bg-brand/5 px-3 py-1.5 text-xs text-brand">
            <Sparkles className="h-3.5 w-3.5" />
            Showing featured resources only
            <button
              type="button"
              onClick={() => setFeaturedOnly(false)}
              className="ml-auto rounded-full px-2 py-0.5 hover:bg-brand/10"
            >
              Clear
            </button>
          </div>
        )}

        <ResourceGrid loading={resourcesQ.isLoading} resources={filtered} />
      </div>
    </DashboardLayout>
  );
}

function ResourceGrid({
  loading,
  resources,
}: {
  loading: boolean;
  resources: LibraryResourceDoc[];
}) {
  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading resources…
      </div>
    );
  }
  if (resources.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
        No resources match these filters yet. Try clearing filters or check
        back soon — new material is added regularly.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {resources.map((r) => (
        <ResourceCard key={r.id} resource={r} />
      ))}
    </div>
  );
}
