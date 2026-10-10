import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// jsdom doesn't implement scrolling; the router calls it on every navigation.
/** Ignores the scroll. */
window.scrollTo = () => {};

// jsdom hides every closed popover but never loads the app's stylesheet, which lays the
// navigation popover out as an always-visible sidebar on wide screens. Tests render that layout.
const wideScreen = document.createElement("style");
wideScreen.textContent = "#site-nav[popover] { display: block; }";
document.head.append(wideScreen);

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
