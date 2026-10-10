import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { THEME_KEY, ThemeToggle } from "../src/components/ThemeToggle";

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

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
