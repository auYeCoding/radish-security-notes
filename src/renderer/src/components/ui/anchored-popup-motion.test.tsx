import { render, screen } from "@testing-library/react";
import { describe, it } from "vitest";

import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@renderer/components/ui/combobox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@renderer/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@renderer/components/ui/select";
import {
  expectMotionClasses,
  expectNoClassContaining,
} from "@renderer/testing/expect-motion-classes";

import { ANCHORED_POPUP_MOTION } from "./popup-motion";
import { FAST_STATE_TRANSITION } from "./state-motion";

/**
 * 旧写法留下的类名片段: 写死的 100ms 时长与滑入位移.
 */
const LEGACY_FRAGMENTS = ["duration-100", "slide-in-from"];

describe("下拉菜单的进入与退出动画", () => {
  it("内容与子菜单内容从触发点淡入并缩放, 用快档, 没有滑入", async () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>菜单</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuSub defaultOpen>
            <DropdownMenuSubTrigger>更多</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>子项</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await screen.findByRole("menuitem", { name: "子项" });

    const content = document.querySelector("[data-slot=dropdown-menu-content]");
    const subContent = document.querySelector(
      "[data-slot=dropdown-menu-sub-content]",
    );
    expectMotionClasses(content, ANCHORED_POPUP_MOTION);
    expectMotionClasses(subContent, ANCHORED_POPUP_MOTION);
    expectNoClassContaining(content, LEGACY_FRAGMENTS);
    expectNoClassContaining(subContent, LEGACY_FRAGMENTS);
  });
});

describe("下拉菜单项的状态过渡", () => {
  it("四种菜单项的悬停, 聚焦与选中都取快档", async () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>菜单</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>普通项</DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>子菜单项</DropdownMenuSubTrigger>
          </DropdownMenuSub>
          <DropdownMenuCheckboxItem checked>勾选项</DropdownMenuCheckboxItem>
          <DropdownMenuRadioGroup value="a">
            <DropdownMenuRadioItem value="a">单选项</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await screen.findByRole("menuitem", { name: "普通项" });

    expectMotionClasses(
      document.querySelector("[data-slot=dropdown-menu-item]"),
      FAST_STATE_TRANSITION,
    );
    expectMotionClasses(
      document.querySelector("[data-slot=dropdown-menu-sub-trigger]"),
      FAST_STATE_TRANSITION,
    );
    expectMotionClasses(
      document.querySelector("[data-slot=dropdown-menu-checkbox-item]"),
      FAST_STATE_TRANSITION,
    );
    expectMotionClasses(
      document.querySelector("[data-slot=dropdown-menu-radio-item]"),
      FAST_STATE_TRANSITION,
    );
  });
});

describe("下拉选择的进入与退出动画", () => {
  it("浮层淡入并缩放, 选项取快档状态过渡, 对齐模式仍无动画", async () => {
    render(
      <Select defaultOpen defaultValue="a">
        <SelectTrigger aria-label="语言">
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          <SelectItem value="a">甲</SelectItem>
        </SelectContent>
      </Select>,
    );
    await screen.findByRole("option", { name: "甲" });

    const content = document.querySelector("[data-slot=select-content]");
    expectMotionClasses(content, ANCHORED_POPUP_MOTION);
    expectMotionClasses(content, "data-[align-trigger=true]:animate-none");
    expectNoClassContaining(content, LEGACY_FRAGMENTS);
    expectMotionClasses(
      document.querySelector("[data-slot=select-item]"),
      FAST_STATE_TRANSITION,
    );
  });
});

describe("组合框的进入与退出动画", () => {
  it("浮层淡入并缩放, 选项取快档状态过渡", async () => {
    render(
      <Combobox defaultOpen items={["甲", "乙"]}>
        <ComboboxInput aria-label="标签" />
        <ComboboxContent>
          <ComboboxList>
            {(item: string) => (
              <ComboboxItem key={item} value={item}>
                {item}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>,
    );
    await screen.findByRole("option", { name: "甲" });

    const content = document.querySelector("[data-slot=combobox-content]");
    expectMotionClasses(content, ANCHORED_POPUP_MOTION);
    expectNoClassContaining(content, LEGACY_FRAGMENTS);
    expectMotionClasses(
      document.querySelector("[data-slot=combobox-item]"),
      FAST_STATE_TRANSITION,
    );
  });
});
