import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useCharacter, useSourceIndex } from "../api/hooks";
import { buildsQuery } from "../api/queries";
import type { Build } from "../api/types";
import type { ClassSection, ClassView } from "../app/classes";
import { ConfidencePill } from "../components/ConfidencePill";
import { EmptyState } from "../components/EmptyState";
import { ObsoleteNotice } from "../components/ObsoleteNotice";
import { QueryResult } from "../components/QueryResult";
import { SourceChips } from "../components/SourceChips";
import { ViewHeader } from "../components/ViewHeader";
import type { CharacterReading } from "../lib/builds";
import { PURPOSE_LABEL, pickBuild } from "../lib/builds";
import { isCurrent } from "../lib/obsolete";
import { optionalText } from "../lib/search";
import { TopicNotes } from "./MechanicsView";

/** A build page's search params: the build to show, by id. */
export interface BuildSearch {
  build?: string;
}

/**
 * Reads a build page's search params.
 *
 * @param search - the router's decoded query values
 * @returns the build id, dropped when unusable
 */
export function validateBuildSearch(search: Record<string, unknown>): BuildSearch {
  return { build: optionalText(search.build) };
}

/** Props of a build page: the class and the build the address names. */
export interface BuildPageProps {
  /** The class whose builds the page shows. */
  section: ClassSection;
  /** The current search params. */
  search: BuildSearch;
}

/** Props for {@link BuildPage}. */
interface BuildPageFrameProps extends BuildPageProps {
  /** Which of the class's views this is, for its heading and lede. */
  view: ClassView;
  /** Renders the picked build, compared with the character when it plays this class. */
  children: (build: Build, character: CharacterReading | null) => ReactNode;
}

/**
 * The build switch: one link per current build (and the picked one, when
 * it is obsolete), the picked one marked as the page shown. Nothing with a
 * single build to show.
 *
 * @param props - the class's builds and the picked build
 * @returns the switch, or null
 */
function BuildSwitch({ builds, picked }: { builds: readonly Build[]; picked: Build }) {
  const shown = builds.filter((b) => isCurrent(b) || b.id === picked.id);
  if (shown.length < 2) return null;
  return (
    <nav className="build-switch" aria-label="Builds">
      {shown.map((b) => (
        <Link
          key={b.id}
          to="."
          search={{ build: b.id }}
          className="build-tab"
          activeOptions={{ exact: true, includeSearch: true }}
          aria-current={b.id === picked.id ? "page" : undefined}
        >
          <span className="purpose">{PURPOSE_LABEL[b.purpose]}</span> {b.title}
        </Link>
      ))}
    </nav>
  );
}

/**
 * The frame every build page shares: the view's heading and lede (with
 * the cited mechanics of its topic), the build switch, the picked build's
 * line (purpose, confidence, sources, or its obsolete notice), then the
 * page's own content for that build. "No builds recorded yet." when the
 * class has none.
 *
 * @param props - the class, the search params, the view and the content renderer
 * @returns the page
 */
export function BuildPage({ section, search, view, children }: BuildPageFrameProps) {
  const builds = useQuery(buildsQuery(section.cls));
  const character = useCharacter(section.cls);
  const sources = useSourceIndex();
  const copy = section.copy[view];
  return (
    <>
      <ViewHeader title={copy.title} lede={copy.lede} />
      {copy.topic ? <TopicNotes cls={section.cls} topic={copy.topic} /> : null}
      <QueryResult query={builds} resource="builds">
        {(rows) => {
          const build = pickBuild(rows, search.build);
          if (!build) return <EmptyState>No builds recorded yet.</EmptyState>;
          return (
            <>
              <BuildSwitch builds={rows} picked={build} />
              {build.obsoleteSince ? (
                <ObsoleteNotice
                  subject={build.title}
                  since={build.obsoleteSince}
                  reason={build.obsoleteReason}
                  sources={build.obsoleteSources}
                  sourceIndex={sources}
                />
              ) : null}
              <div className="build-line">
                <span className="chip purpose">{PURPOSE_LABEL[build.purpose]}</span>
                <h3>{build.title}</h3>
                <ConfidencePill confidence={build.confidence} />
                <SourceChips ids={build.sources} sources={sources} max={2} />
              </div>
              {children(build, character)}
            </>
          );
        }}
      </QueryResult>
    </>
  );
}
