import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createEntryTestEnvironment } from "@renderer/testing/entry-test-environment";
import { TEST_TAGS } from "@renderer/testing/tag-fixtures";

import { DetailTagBadges } from "./detail-tag-badges";

/**
 * 在带三个标签的环境里渲染标签行, 并等标签读取完成.
 * @param tagIds 条目带的标签编号.
 */
async function renderBadges(
  tagIds: readonly string[] | undefined,
): Promise<void> {
  const environment = await createEntryTestEnvironment({ tags: TEST_TAGS });
  await environment.tagStore.getState().load();
  render(<DetailTagBadges tagIds={tagIds} />, {
    wrapper: environment.Providers,
  });
}

describe("详情里的标签徽章", () => {
  it("按条目上的选择顺序列出带的标签, 每个标签一个徽章", async () => {
    await renderBadges(["personal-tag", "important"]);

    const list = screen.getByRole("list", { name: "标签" });
    expect(
      within(list)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["个人", "重要"]);
  });

  it("条目没有标签时不显示这一行", async () => {
    await renderBadges(undefined);

    expect(screen.queryByRole("list", { name: "标签" })).toBeNull();
  });

  it("带的标签已不在标签列表里时, 只显示还在的", async () => {
    await renderBadges(["deleted-tag", "work-tag"]);

    const list = screen.getByRole("list", { name: "标签" });
    expect(
      within(list)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["工作"]);
  });

  it("带的标签都已不在标签列表里时不显示这一行", async () => {
    await renderBadges(["deleted-tag"]);

    expect(screen.queryByRole("list", { name: "标签" })).toBeNull();
  });
});
