/**
 * The web page capture: a page fetched once, turned into Markdown-ish text
 * (headings, paragraphs, lists, tables, code and quotes; scripts, styles,
 * navigation and footers dropped) and written under the record's
 * `evidence/` with a front-matter block naming its URL, capture time and
 * title.
 *
 * @module
 */
import { posix } from "node:path";
import type { AnyNode, Element, ParentNode } from "domhandler";
import { isTag, isText } from "domhandler";
import type { CaptureContext } from "./context";
import { commitStaged, isCaptured, stageText } from "./context";
import type { HttpOptions } from "./http";
import { DESKTOP_UA, HttpClient } from "./http";
import { parseHtml } from "./html";
import { isoLocal } from "./time";

/** Elements whose content never reaches the text: code, styling, and the site's own chrome. */
const DROPPED = new Set([
  "head",
  "script",
  "style",
  "noscript",
  "template",
  "svg",
  "nav",
  "footer",
  "iframe",
  "form",
  "button",
]);

/** Elements that start a block of their own; everything else flows inline. */
const BLOCKS = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "body",
  "dd",
  "details",
  "div",
  "dl",
  "dt",
  "figcaption",
  "figure",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "html",
  "li",
  "main",
  "ol",
  "p",
  "pre",
  "section",
  "summary",
  "table",
  "ul",
]);

/** The longest file name {@link slugOfUrl} gives, before the extension. */
const MAX_SLUG = 120;

/**
 * Collapses every whitespace run to one space, keeping the line breaks a
 * `<br>` put in, and trims each line.
 *
 * @param text - the raw inline text, `\n` only where a `<br>` stood
 * @returns the cleaned text; `""` when nothing but whitespace was there
 */
function tidy(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

/**
 * Reads a node's inline text: its text nodes in order, a `<br>` as a line
 * break, dropped elements and nested lists left out.
 *
 * @param node - the node to read
 * @returns the raw text, before {@link tidy}
 */
function rawInline(node: AnyNode): string {
  if (isText(node)) return node.data.replace(/\n/g, " ");
  if (!isTag(node) || DROPPED.has(node.name) || node.name === "ul" || node.name === "ol") {
    return "";
  }
  if (node.name === "br") return "\n";
  return node.children.map(rawInline).join("");
}

/**
 * Reads an element's inline text, cleaned.
 *
 * @param node - the element
 * @returns its text, whitespace collapsed
 */
function inline(node: AnyNode): string {
  return tidy(rawInline(node));
}

/**
 * Lists an element's child elements of the given names.
 *
 * @param node - the parent
 * @param names - the tag names to keep
 * @returns the matching children, in order
 */
function childTags(node: Element, ...names: string[]): Element[] {
  return node.children.filter(
    (child): child is Element => isTag(child) && names.includes(child.name),
  );
}

/**
 * Writes a list as Markdown lines: `- ` for an unordered list, `1. ` and on
 * for an ordered one, a nested list indented under its item.
 *
 * @param list - the `<ul>` or `<ol>`
 * @param depth - how deep it sits inside other lists
 * @returns its lines
 */
function listLines(list: Element, depth: number): string[] {
  const indent = "  ".repeat(depth);
  return childTags(list, "li").flatMap((item, index) => {
    const marker = list.name === "ol" ? `${index + 1}. ` : "- ";
    const text = inline(item).replace(/\n/g, " ");
    const nested = childTags(item, "ul", "ol").flatMap((sub) => listLines(sub, depth + 1));
    return text ? [`${indent}${marker}${text}`, ...nested] : nested;
  });
}

/**
 * Writes a table as Markdown rows, `| a | b |`, with a separator row under
 * a first row made of header cells. A `|` inside a cell is escaped.
 *
 * @param table - the `<table>`
 * @returns its rows, one per line; `""` when it has none
 */
function tableText(table: Element): string {
  const rows: Element[] = [];
  /**
   * Collects the rows under a table or one of its sections, skipping nested tables.
   *
   * @param parent - the table or a `thead`/`tbody`/`tfoot`
   */
  const collect = (parent: Element): void => {
    for (const child of childTags(parent, "tr", "thead", "tbody", "tfoot")) {
      if (child.name === "tr") rows.push(child);
      else collect(child);
    }
  };
  collect(table);
  const lines: string[] = [];
  rows.forEach((row, index) => {
    const cells = childTags(row, "th", "td");
    if (cells.length === 0) return;
    const texts = cells.map((cell) => inline(cell).replace(/\n/g, " ").replaceAll("|", "\\|"));
    lines.push(`| ${texts.join(" | ")} |`);
    if (index === 0 && cells.every((cell) => cell.name === "th")) {
      lines.push(`| ${cells.map(() => "---").join(" | ")} |`);
    }
  });
  return lines.join("\n");
}

/**
 * Reads the text under a node, `<pre>`'s, as it stands.
 *
 * @param node - the node
 * @returns its text nodes joined, line breaks and spacing kept
 */
function preText(node: AnyNode): string {
  if (isText(node)) return node.data;
  if (!isTag(node)) return "";
  if (node.name === "br") return "\n";
  return node.children.map(preText).join("");
}

/**
 * Writes the Markdown blocks under a node, in document order: loose text
 * and inline elements between blocks become paragraphs.
 *
 * @param node - the container to walk
 * @returns its blocks
 */
function blocks(node: ParentNode): string[] {
  const out: string[] = [];
  let pending = "";
  /** Ends the paragraph the loose inline content so far makes, if any. */
  const flush = (): void => {
    const text = tidy(pending);
    if (text) out.push(text);
    pending = "";
  };
  for (const child of node.children) {
    if (isText(child)) {
      pending += rawInline(child);
      continue;
    }
    if (!isTag(child) || DROPPED.has(child.name)) continue;
    if (!BLOCKS.has(child.name)) {
      pending += rawInline(child);
      continue;
    }
    flush();
    const heading = /^h([1-6])$/.exec(child.name);
    if (heading) {
      const text = inline(child).replace(/\n/g, " ");
      if (text) out.push(`${"#".repeat(Number(heading[1]))} ${text}`);
    } else if (child.name === "p") {
      const text = inline(child);
      if (text) out.push(text);
    } else if (child.name === "ul" || child.name === "ol") {
      const lines = listLines(child, 0);
      if (lines.length > 0) out.push(lines.join("\n"));
    } else if (child.name === "table") {
      const text = tableText(child);
      if (text) out.push(text);
    } else if (child.name === "pre") {
      const text = preText(child).replace(/^\n+|\s+$/g, "");
      if (text) out.push(`\`\`\`\n${text}\n\`\`\``);
    } else if (child.name === "blockquote") {
      const quoted = blocks(child).join("\n\n");
      if (quoted) out.push(quoted.replace(/^/gm, "> ").replace(/^> $/gm, ">"));
    } else if (child.name === "hr") {
      out.push("---");
    } else {
      out.push(...blocks(child));
    }
  }
  flush();
  return out;
}

/**
 * Turns an HTML page into Markdown-ish text: headings as `#` lines,
 * paragraphs, `-` and `1.` lists, `|` tables, fenced `<pre>` blocks and
 * `>` quotes. Scripts, styles, the `<head>`, navigation and footers are
 * dropped; links and emphasis keep only their text.
 *
 * @param html - the page
 * @returns the text, blocks separated by a blank line, ending in a newline;
 *   `""` when the page holds no text
 */
export function htmlToText(html: string): string {
  const $ = parseHtml(html);
  const text = blocks($.root()[0]!).join("\n\n");
  return text ? `${text}\n` : "";
}

/**
 * Reads a page's title: its `<title>`, else its first `<h1>`.
 *
 * @param html - the page
 * @returns the title, whitespace collapsed; `""` when the page has neither
 */
export function pageTitle(html: string): string {
  const $ = parseHtml(html);
  for (const selector of ["title", "h1"]) {
    const element = $(selector)[0];
    const text = element ? inline(element).replace(/\n/g, " ") : "";
    if (text) return text;
  }
  return "";
}

/**
 * Names the capture of a URL: its host (without `www.`) and path,
 * lowercased, each run of anything but letters and digits made one `-`.
 * The query and fragment are left out, so the same page always gets the
 * same name.
 *
 * @param url - an absolute URL
 * @returns the slug, at most {@link MAX_SLUG} characters
 * @throws {TypeError} if `url` isn't an absolute URL
 */
export function slugOfUrl(url: string): string {
  const { hostname, pathname } = new URL(url);
  return `${hostname.replace(/^www\./, "")}${pathname}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, MAX_SLUG)
    .replace(/^-+|-+$/g, "");
}

/**
 * Builds the web client: desktop Chrome, English first.
 *
 * @param options - overrides, such as a test's fetch and sleep
 * @returns the client
 */
export function webClient(options: Partial<HttpOptions> = {}): HttpClient {
  return new HttpClient({
    userAgent: DESKTOP_UA,
    headers: { "Accept-Language": "en-US,en;q=0.9" },
    delayMs: 1000,
    ...options,
  });
}

/**
 * Captures one web page as `<outdir>/<slug>.md`: a front-matter block
 * (`url`, `captured_at`, `title`) and the page as {@link htmlToText} writes
 * it, with its ledger line. A page already captured is kept as it is and
 * not fetched again.
 *
 * @param context - the run
 * @param outdir - the record-relative folder under `evidence/`
 * @param url - the page's absolute URL
 * @returns the path written, or `null` when the page was already captured
 * @throws if the page never answers 200
 * @throws {LedgerError} when the target file has a line but is missing or
 *   differs from it, or is on disk without a line; nothing is written then
 */
export async function webCapture(
  context: CaptureContext,
  outdir: string,
  url: string,
): Promise<string | null> {
  const path = posix.join(outdir, `${slugOfUrl(url)}.md`);
  if (isCaptured(context, path)) {
    context.log(`  ${path}: already captured`);
    return null;
  }
  const response = await context.http.get(url);
  if (!response) throw new Error(`could not fetch ${url}`);
  const html = await response.text();
  const at = context.now();
  const front = [
    "---",
    `url: ${JSON.stringify(url)}`,
    `captured_at: ${isoLocal(at, context.offsetAt)}`,
    `title: ${JSON.stringify(pageTitle(html))}`,
    "---",
    "",
  ].join("\n");
  commitStaged(context, [stageText(path, `${front}\n${htmlToText(html)}`, url, at)]);
  return path;
}
