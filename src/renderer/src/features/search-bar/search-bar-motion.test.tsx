import { render, screen } from "@testing-library/react";
import { describe, it } from "vitest";

import { FAST_STATE_TRANSITION } from "@renderer/components/ui/state-motion";
import { createEntryTestEnvironment } from "@renderer/testing/entry-test-environment";
import {
  expectMotionClasses,
  expectNoClassContaining,
} from "@renderer/testing/expect-motion-classes";

import { SearchBar } from "./search-bar";

describe("搜索栏的状态过渡", () => {
  it("输入框组继承快档状态过渡, 聚焦环与边框的变化平滑", async () => {
    const environment = await createEntryTestEnvironment();
    render(<SearchBar />, { wrapper: environment.Providers });

    const group = screen.getByRole("group");

    expectMotionClasses(group, FAST_STATE_TRANSITION);
    expectNoClassContaining(group, ["transition-all", "transition-["]);
  });
});
