import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { SiteHeader } from "./SiteChrome";

describe("SiteHeader", () => {
  test("SOU CORRETOR leva ao login do painel", () => {
    render(<SiteHeader current="imoveis" />);
    expect(screen.getByRole("link", { name: "SOU CORRETOR" })).toHaveAttribute("href", "/painel/entrar");
  });
});
