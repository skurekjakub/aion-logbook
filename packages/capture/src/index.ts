/**
 * `@aion/capture`: the capture ledger and the scrapers that write
 * research records' evidence. Pure I/O: HTTP, HTML, files and the ledger;
 * nothing from `apps/*`. Each scraper is a namespace, since their parsers
 * share names.
 *
 * @module
 */
export * from "./backfill";
export * from "./commands";
export * from "./context";
export * from "./html";
export * from "./http";
export * from "./ledger";
export * from "./searches";
export * from "./text";
export * from "./time";
export * as media from "./media";
export * as web from "./web";
export * as youtube from "./youtube";
