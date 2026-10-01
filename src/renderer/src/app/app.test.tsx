import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "@renderer/app/app";
import { createVaultTestEnvironment } from "@renderer/testing/vault-test-environment";

describe("App", () => {
  it("在 jsdom 中能渲染且不抛出错误", async () => {
    const { Providers } = await createVaultTestEnvironment({
      status: "unlocked",
    });

    expect(() => render(<App />, { wrapper: Providers })).not.toThrow();
  });
});
