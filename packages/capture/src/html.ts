/**
 * HTML parsing for the scrapers, over cheerio with the htmlparser2 backend
 * (lenient, no tree repair, closest to Python's `html.parser`), plus
 * BeautifulSoup's `get_text` so extracted text matches the retired Python
 * scrapers'.
 *
 * @module
 */
import type { CheerioAPI } from "cheerio";
import { load } from "cheerio";
import type { AnyNode } from "domhandler";
import { hasChildren, isDocument, isTag, isText } from "domhandler";
import { pyStrip } from "./text";

/** Tags whose text BeautifulSoup's `get_text` leaves out (it types their strings apart). */
const SKIPPED_TEXT_PARENTS = new Set(["script", "style", "template"]);

/**
 * Parses an HTML document or fragment.
 *
 * @param html - the markup
 * @returns a cheerio root over it
 */
export function parseHtml(html: string): CheerioAPI {
  return load(html, { xml: { xmlMode: false, decodeEntities: true } }, false);
}

/**
 * Lists the text strings under a node in document order, as BeautifulSoup's
 * `_all_strings` does: text nodes only, so no comments, and nothing inside
 * a script, style or template.
 *
 * @param node - the node to walk
 * @returns its text strings
 */
export function textStrings(node: AnyNode): string[] {
  const out: string[] = [];
  /**
   * Appends the strings under one node.
   *
   * @param current - the node
   */
  const visit = (current: AnyNode): void => {
    if (isText(current)) {
      out.push(current.data);
      return;
    }
    if (isTag(current) && SKIPPED_TEXT_PARENTS.has(current.name)) return;
    if ((isTag(current) || isDocument(current)) && hasChildren(current)) {
      current.children.forEach(visit);
    }
  };
  visit(node);
  return out;
}

/**
 * Collects a node's text, as BeautifulSoup's `get_text(separator, strip=True)`:
 * each string stripped with Python's whitespace set, empty ones dropped,
 * the rest joined by `separator`.
 *
 * @param node - the element (or root) to read
 * @param separator - what joins the strings
 * @returns the joined text; `""` when the node holds no text
 */
export function getText(node: AnyNode, separator: string): string {
  return textStrings(node)
    .map(pyStrip)
    .filter((s) => s.length > 0)
    .join(separator);
}
