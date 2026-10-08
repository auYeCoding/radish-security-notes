import { render, screen } from "@testing-library/react";
import { MinusIcon, Trash2Icon } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { FAST_STATE_TRANSITION } from "@renderer/components/ui/state-motion";
import { InputGroup } from "@renderer/components/ui/input-group";
import { createEntryTestEnvironment } from "@renderer/testing/entry-test-environment";
import {
  expectMotionClasses,
  expectNoClassContaining,
} from "@renderer/testing/expect-motion-classes";

import { IconActionButton } from "./icon-action-button";
import { RevealToggleButton } from "./reveal-toggle-button";
import { TagColorPicker } from "./tag-color-picker";
import { WindowControlButton } from "./window-control-button";

/**
 * 不关心回调的占位函数.
 */
const NO_OP = vi.fn();

/**
 * 一个继承按钮快档状态过渡的应用自有按钮用例.
 */
interface InheritedButtonCase {
  /**
   * 按钮名称, 作为用例标题.
   */
  readonly name: string;
  /**
   * 要渲染的元素.
   */
  readonly element: React.ReactElement;
  /**
   * 渲染后找到按钮元素.
   */
  readonly find: () => HTMLElement;
}

/**
 * 全部继承按钮快档状态过渡的应用自有按钮.
 */
const INHERITED_BUTTON_CASES: readonly InheritedButtonCase[] = [
  {
    name: "标题栏窗口按钮",
    element: (
      <WindowControlButton label="最小化" onClick={NO_OP}>
        <MinusIcon aria-hidden="true" />
      </WindowControlButton>
    ),
    find: () => screen.getByRole("button", { name: "最小化" }),
  },
  {
    name: "标题栏关闭按钮 (危险色)",
    element: (
      <WindowControlButton label="关闭" onClick={NO_OP} isDanger>
        <MinusIcon aria-hidden="true" />
      </WindowControlButton>
    ),
    find: () => screen.getByRole("button", { name: "关闭" }),
  },
  {
    name: "图标按钮",
    element: (
      <IconActionButton label="删除条目" onClick={NO_OP}>
        <Trash2Icon aria-hidden="true" />
      </IconActionButton>
    ),
    find: () => screen.getByRole("button", { name: "删除条目" }),
  },
  {
    name: "显示或隐藏按钮",
    element: (
      <InputGroup>
        <RevealToggleButton isRevealed={false} onToggle={NO_OP} />
      </InputGroup>
    ),
    find: () => screen.getByRole("button", { name: "显示密码" }),
  },
  {
    name: "标签调色板的选项",
    element: (
      <TagColorPicker value="blue" onChange={NO_OP} labelledBy="color-label" />
    ),
    find: () => screen.getByRole("button", { name: "蓝色" }),
  },
];

describe("应用自有按钮的状态过渡", () => {
  it.each(INHERITED_BUTTON_CASES)(
    "$name 继承快档状态过渡, 不用 transition-all",
    async (testCase) => {
      const environment = await createEntryTestEnvironment();
      render(testCase.element, { wrapper: environment.Providers });

      expectMotionClasses(testCase.find(), FAST_STATE_TRANSITION);
      expectNoClassContaining(testCase.find(), [
        "transition-all",
        "transition-[",
      ]);
    },
  );

  it("关闭按钮的危险色悬停类与快档过渡同时在", async () => {
    const environment = await createEntryTestEnvironment();
    render(INHERITED_BUTTON_CASES[1].element, {
      wrapper: environment.Providers,
    });

    const classList = Array.from(INHERITED_BUTTON_CASES[1].find().classList);
    expect(classList).toContain("hover:text-destructive");
    expectMotionClasses(
      INHERITED_BUTTON_CASES[1].find(),
      FAST_STATE_TRANSITION,
    );
  });

  it("选中的颜色用按下状态的底色与描边, 同一个按钮上有快档过渡", async () => {
    const environment = await createEntryTestEnvironment();
    render(INHERITED_BUTTON_CASES[4].element, {
      wrapper: environment.Providers,
    });

    const selected = INHERITED_BUTTON_CASES[4].find();
    expect(selected.getAttribute("aria-pressed")).toBe("true");
    expect(Array.from(selected.classList)).toEqual(
      expect.arrayContaining(["aria-pressed:bg-accent", "aria-pressed:ring-1"]),
    );
    expectMotionClasses(selected, FAST_STATE_TRANSITION);
  });
});
