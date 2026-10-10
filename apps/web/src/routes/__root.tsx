import { useQuery } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet, useLocation } from "@tanstack/react-router";
import { recordQuery, recordsQuery, sourcesQuery } from "../api/queries";
import type { StampStat } from "../app/classes";
import {
  activeTab,
  allSections,
  APP_TITLE,
  classSectionsWithContent,
  sectionForPath,
} from "../app/classes";
import type { RouterContext } from "../app/router-context";
import { ErrorBox } from "../components/ErrorBox";
import { PageHeader } from "../components/PageHeader";
import { SideNav } from "../components/SideNav";
import { TopBar } from "../components/TopBar";

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

/** The navigation's element id, which the phone's menu button opens it by. */
const NAV_ID = "site-nav";

/** Stamp labels, per stat. */
const STAT_LABEL: Record<StampStat, string> = {
  updated: "Updated",
  season: "Season",
  sources: "Sources",
};

/**
 * The app chrome: the phone's top bar, the logbook navigation (home, every
 * class a record covers, the shared pages, and the active section's pages
 * beneath it), the header (from the active class's research record, its
 * lede on the class's landing page), the view in the main landmark, and
 * the footer.
 *
 * @returns the app chrome around the current view
 */
function RootLayout() {
  const pathname = useLocation({ select: (l) => l.pathname });
  const records = useQuery(recordsQuery());
  const sections = allSections(classSectionsWithContent(records.data ?? []));
  const section = sectionForPath(sections, pathname);
  const tab = section ? activeTab(section.tabs, pathname) : undefined;
  const stamp = section?.stamp ?? [];
  const slug = section?.recordSlug ?? null;

  const record = useQuery({ ...recordQuery(slug ?? ""), enabled: slug != null });
  const sources = useQuery({
    ...sourcesQuery(slug ? { record: slug } : {}),
    enabled: stamp.includes("sources"),
  });

  const values: Record<StampStat, string | number | null | undefined> = {
    updated: record.data?.updatedAt,
    season: record.data?.seasonLabel,
    sources: sources.data?.length,
  };
  const lede = record.isError ? (
    <ErrorBox resource="research record" error={record.error} />
  ) : (
    (record.data?.lede ?? section?.lede ?? "")
  );

  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const landing = section != null && path === section.to;

  return (
    <div className="wrap">
      <TopBar navId={NAV_ID} trail={[section?.label ?? APP_TITLE, ...(tab ? [tab.label] : [])]} />
      <SideNav
        id={NAV_ID}
        label="Logbook"
        sections={sections.map((s, i) => ({
          id: s.id,
          label: s.label,
          link: s.link,
          current: s.id !== section?.id ? null : landing ? "page" : "section",
          startsGroup: i > 0 && s.kind !== sections[i - 1]?.kind,
          hasPages: s.tabs.length > 0,
          pages:
            s.id === section?.id
              ? s.tabs.map((t) => ({
                  id: t.id,
                  label: t.label,
                  link: t.link,
                  current: t.id === tab?.id,
                }))
              : [],
        }))}
      />
      <div className="page">
        {records.isError ? <ErrorBox resource="research records" error={records.error} /> : null}
        <PageHeader
          context={null}
          title={section?.title ?? APP_TITLE}
          // The record's lede introduces a class, so it shows on the landing page only; a failure shows everywhere.
          lede={landing || record.isError ? lede : ""}
          stats={stamp.map((s) => [STAT_LABEL[s], values[s]] as const)}
        />
        <main>
          <section className="panel">
            <Outlet />
          </section>
        </main>
        <footer>
          {slug ? (
            <>
              Built from the research record's evidence captures:{" "}
              <span className="mono">research/{slug}/</span>. Game content and names belong to
              NCSOFT.
            </>
          ) : (
            "Built from the research records' evidence captures. Game content and names belong to NCSOFT."
          )}
        </footer>
      </div>
    </div>
  );
}
