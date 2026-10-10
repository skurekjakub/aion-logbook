import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import indexHtml from "../index.html?raw";
import { THEME_KEY, ThemeToggle } from "../src/components/ThemeToggle";

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.head.querySelectorAll("script[data-test-pre-paint]").forEach((s) => {
    s.remove();
  });
});

/**
 * Parses the app's `index.html` as the browser would receive it.
 *
 * @returns the parsed document
 */
function indexDocument(): Document {
  return new DOMParser().parseFromString(indexHtml, "text/html");
}

/**
 * Runs the inline scripts of `index.html`'s head in the test document, as
 * the browser does before it loads the app's module.
 */
function runPrePaint() {
  const inline = [...indexDocument().head.querySelectorAll("script:not([src])")];
  const script = document.createElement("script");
  script.dataset.testPrePaint = "";
  script.textContent = inline.map((s) => s.textContent).join("\n");
  document.head.append(script);
}

describe("ThemeToggle", () => {
  it("steps auto, light, dark and back, remembering the choice under aion-theme", () => {
    // Arrange
    render(<ThemeToggle />);
    const button = screen.getByRole("button", { name: /^Theme: Auto/ });

    // Act
    fireEvent.click(button);
    const light = [document.documentElement.dataset.theme, localStorage.getItem(THEME_KEY)];
    fireEvent.click(button);
    const dark = [document.documentElement.dataset.theme, localStorage.getItem(THEME_KEY)];
    fireEvent.click(button);
    const auto = [document.documentElement.dataset.theme, localStorage.getItem(THEME_KEY)];

    // Assert
    expect(THEME_KEY).toBe("aion-theme");
    expect(light).toEqual(["light", "light"]);
    expect(dark).toEqual(["dark", "dark"]);
    expect(auto).toEqual([undefined, null]);
  });

  it("starts from the remembered choice", () => {
    // Arrange
    localStorage.setItem(THEME_KEY, "dark");

    // Act
    render(<ThemeToggle />);

    // Assert
    expect(screen.getByRole("button", { name: /^Theme: Dark/ })).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });
});

describe("the pre-paint theme script in index.html", () => {
  it("sits in the head, ahead of the app's module script", () => {
    // Arrange
    const doc = indexDocument();

    // Act
    const scripts = [...doc.querySelectorAll("script")];
    const prePaint = scripts.findIndex((s) => !s.src && s.textContent.includes("data-theme"));
    const app = scripts.findIndex((s) => s.type === "module");

    // Assert
    expect(prePaint).toBeGreaterThanOrEqual(0);
    expect(doc.head.contains(scripts[prePaint] ?? null)).toBe(true);
    expect(prePaint).toBeLessThan(app);
  });

  it("applies the remembered theme to the root element", () => {
    // Arrange
    localStorage.setItem(THEME_KEY, "light");

    // Act
    runPrePaint();

    // Assert
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });

  it("leaves the root element to the system theme when nothing valid is remembered", () => {
    // Arrange
    localStorage.setItem(THEME_KEY, "sepia");

    // Act
    runPrePaint();

    // Assert
    expect(document.documentElement).not.toHaveAttribute("data-theme");
  });
});
