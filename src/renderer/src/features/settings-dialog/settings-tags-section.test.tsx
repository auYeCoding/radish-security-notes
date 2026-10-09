import { act, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "@renderer/components/ui/button";
import { createPreferencesTestEnvironment } from "@renderer/testing/preferences-test-environment";

import {
  SettingsTagsSection,
  type SettingsTagsEntries,
} from "./settings-tags-section";

/**
 * 标签分区的新建操作按钮与标签列表.
 */
const TAGS_ENTRIES: SettingsTagsEntries = {
  createAction: <Button>新建操作</Button>,
  tagList: <p>标签列表</p>,
};

/**
 * 渲染标签分区.
 * @returns 偏好环境, 用来切换语言.
 */
async function renderSection(): ReturnType<
  typeof createPreferencesTestEnvironment
> {
  const environment = await createPreferencesTestEnvironment();
  render(<SettingsTagsSection entries={TAGS_ENTRIES} />, {
    wrapper: environment.Providers,
  });
  return environment;
}

describe("设置的标签分区", () => {
  it("依次是新建标签一行与标签列表, 新建行有名称, 说明与操作", async () => {
    await renderSection();

    const text = screen.getByRole("region", { name: "标签" }).textContent ?? "";
    const expectedInOrder = [
      "新建标签",
      "新建用来给条目分类的标签. 在搜索框里输入标签名, 就能找到带这个标签的条目.",
      "新建操作",
      "标签列表",
    ];
    const positions = expectedInOrder.reduce<number[]>((found, part) => {
      const [previous = -1] = found.slice(-1);
      return [...found, text.indexOf(part, previous + 1)];
    }, []);
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("英文界面下分区标题, 行名称与说明是英文", async () => {
    const environment = await renderSection();

    await act(() => environment.i18n.changeLanguage("en"));

    const section = within(screen.getByRole("region", { name: "Tags" }));
    expect(section.getByText("New tag")).toBeDefined();
    expect(
      section.getByText(
        "Create tags to organize your entries. Type a tag name in the search box to find the entries that carry it.",
      ),
    ).toBeDefined();
  });
});
