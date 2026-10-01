import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "@renderer/app/app";
import { createEntryTestEnvironment } from "@renderer/testing/entry-test-environment";

describe("App", () => {
  it("在 jsdom 中能渲染且不抛出错误", async () => {
    const { Providers } = await createEntryTestEnvironment();

    expect(() => render(<App />, { wrapper: Providers })).not.toThrow();
  });
});
