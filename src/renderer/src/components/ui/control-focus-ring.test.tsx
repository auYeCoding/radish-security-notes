import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Badge } from "@renderer/components/ui/badge";
import { Button } from "@renderer/components/ui/button";
import { Checkbox } from "@renderer/components/ui/checkbox";
import { Combobox, ComboboxChips } from "@renderer/components/ui/combobox";
import { FieldLabel } from "@renderer/components/ui/field";
import { Input } from "@renderer/components/ui/input";
import {
  InputGroup,
  InputGroupInput,
} from "@renderer/components/ui/input-group";
import {
  RadioGroup,
  RadioGroupItem,
} from "@renderer/components/ui/radio-group";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import {
  Select,
  SelectTrigger,
  SelectValue,
} from "@renderer/components/ui/select";
import { Switch } from "@renderer/components/ui/switch";
import { Textarea } from "@renderer/components/ui/textarea";
import { Toggle } from "@renderer/components/ui/toggle";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@renderer/components/ui/toggle-group";
import { expectNoClassContaining } from "@renderer/testing/expect-motion-classes";

import {
  DESTRUCTIVE_FOCUS_OUTLINE_COLOR,
  FIELD_LABEL_FOCUS_OUTLINE_RESET,
  FOCUS_OUTLINE,
  INSET_FOCUS_OUTLINE,
} from "./focus-outline";

/**
 * 外圈相关的类名片段: 聚焦与错误描边不再用外圈表达.
 */
const RING_FRAGMENTS: readonly string[] = ["ring-3", "ring-[3px]", "ring-ring"];

/**
 * 取元素的类名列表.
 * @param element 元素, 可以是没找到的 null.
 * @returns 类名列表.
 */
function classesOf(element: Element | null): string[] {
  expect(element).not.toBeNull();
  return Array.from(element?.classList ?? []);
}

/**
 * 一个文本框类控件的用例: 聚焦与错误都用 1px 边框变色表达.
 */
interface BorderControlCase {
  /**
   * 控件名称, 作为用例标题.
   */
  name: string;
  /**
   * 要渲染的元素.
   */
  element: React.ReactElement;
  /**
   * 渲染后找到带聚焦类的元素.
   */
  find: () => Element | null;
  /**
   * 聚焦时变色的边框类名.
   */
  focusClass: string;
  /**
   * 错误时变色的边框类名.
   */
  invalidClass: string;
}

/**
 * 全部文本框类控件.
 */
const BORDER_CONTROL_CASES: readonly BorderControlCase[] = [
  {
    name: "单行输入框",
    element: <Input aria-label="名称" />,
    find: () => screen.getByRole("textbox", { name: "名称" }),
    focusClass: "focus-visible:border-ring",
    invalidClass: "aria-invalid:border-destructive",
  },
  {
    name: "多行输入框",
    element: <Textarea aria-label="备注" />,
    find: () => screen.getByRole("textbox", { name: "备注" }),
    focusClass: "focus-visible:border-ring",
    invalidClass: "aria-invalid:border-destructive",
  },
  {
    name: "输入框组",
    element: (
      <InputGroup>
        <InputGroupInput aria-label="搜索" />
      </InputGroup>
    ),
    find: () => screen.getByRole("group"),
    focusClass:
      "has-[[data-slot=input-group-control]:focus-visible]:border-ring",
    invalidClass: "has-[[data-slot][aria-invalid=true]]:border-destructive",
  },
  {
    name: "多选组合框的徽章容器",
    element: (
      <Combobox multiple>
        <ComboboxChips />
      </Combobox>
    ),
    find: () => document.querySelector("[data-slot=combobox-chips]"),
    focusClass: "focus-within:border-ring",
    invalidClass: "has-aria-invalid:border-destructive",
  },
  {
    name: "下拉选择的触发器",
    element: (
      <Select>
        <SelectTrigger aria-label="语言">
          <SelectValue />
        </SelectTrigger>
      </Select>
    ),
    find: () => screen.getByRole("combobox", { name: "语言" }),
    focusClass: "focus-visible:border-ring",
    invalidClass: "aria-invalid:border-destructive",
  },
];

describe("文本框类控件的聚焦与错误描边: 1px 边框变色", () => {
  it.each(BORDER_CONTROL_CASES)(
    "$name 聚焦与错误都只变边框颜色, 没有外圈, 没有轮廓",
    (testCase) => {
      render(testCase.element);
      const classes = classesOf(testCase.find());

      expect(classes).toContain(testCase.focusClass);
      expect(classes).toContain(testCase.invalidClass);
      expect(classes).toContain("border");
      expectNoClassContaining(testCase.find(), [
        ...RING_FRAGMENTS,
        "ring-destructive",
        "focus-visible:outline",
      ]);
    },
  );

  it("暗色下的错误边框不再带透明度", () => {
    render(<Input aria-label="名称" />);

    expectNoClassContaining(screen.getByRole("textbox", { name: "名称" }), [
      "aria-invalid:border-destructive/",
    ]);
  });
});

/**
 * 一个非文本控件的用例: 聚焦用 1px 带间隔轮廓表达.
 */
interface OutlineControlCase {
  /**
   * 控件名称, 作为用例标题.
   */
  name: string;
  /**
   * 要渲染的元素.
   */
  element: React.ReactElement;
  /**
   * 渲染后找到带聚焦轮廓类的元素.
   */
  find: () => Element | null;
  /**
   * 该控件应带的聚焦轮廓类名, 空格分隔.
   */
  outline: string;
}

/**
 * 全部非文本控件.
 */
const OUTLINE_CONTROL_CASES: readonly OutlineControlCase[] = [
  {
    name: "按钮",
    element: <Button>保存</Button>,
    find: () => screen.getByRole("button", { name: "保存" }),
    outline: FOCUS_OUTLINE,
  },
  {
    name: "破坏性按钮",
    element: <Button variant="destructive">删除</Button>,
    find: () => screen.getByRole("button", { name: "删除" }),
    outline: `${FOCUS_OUTLINE} ${DESTRUCTIVE_FOCUS_OUTLINE_COLOR}`,
  },
  {
    name: "切换按钮",
    element: <Toggle>粗体</Toggle>,
    find: () => screen.getByRole("button", { name: "粗体" }),
    outline: FOCUS_OUTLINE,
  },
  {
    name: "切换按钮分组里的按钮",
    element: (
      <ToggleGroup>
        <ToggleGroupItem value="left">靠左</ToggleGroupItem>
      </ToggleGroup>
    ),
    find: () => screen.getByRole("button", { name: "靠左" }),
    outline: FOCUS_OUTLINE,
  },
  {
    name: "徽章",
    element: <Badge>标签</Badge>,
    find: () => screen.getByText("标签"),
    outline: FOCUS_OUTLINE,
  },
  {
    name: "破坏性徽章",
    element: <Badge variant="destructive">危险</Badge>,
    find: () => screen.getByText("危险"),
    outline: `${FOCUS_OUTLINE} ${DESTRUCTIVE_FOCUS_OUTLINE_COLOR}`,
  },
  {
    name: "勾选框",
    element: <Checkbox aria-label="同意" />,
    find: () => screen.getByRole("checkbox", { name: "同意" }),
    outline: `${FOCUS_OUTLINE} ${FIELD_LABEL_FOCUS_OUTLINE_RESET}`,
  },
  {
    name: "开关",
    element: <Switch aria-label="自动备份" />,
    find: () => screen.getByRole("switch", { name: "自动备份" }),
    outline: `${FOCUS_OUTLINE} ${FIELD_LABEL_FOCUS_OUTLINE_RESET}`,
  },
  {
    name: "单选项",
    element: (
      <RadioGroup>
        <RadioGroupItem value="a" aria-label="甲" />
      </RadioGroup>
    ),
    find: () => screen.getByRole("radio", { name: "甲" }),
    outline: `${FOCUS_OUTLINE} ${FIELD_LABEL_FOCUS_OUTLINE_RESET}`,
  },
  {
    name: "可滚动区域的视口",
    element: <ScrollArea>内容</ScrollArea>,
    find: () => document.querySelector("[data-slot=scroll-area-viewport]"),
    outline: INSET_FOCUS_OUTLINE,
  },
];

describe("非文本控件的聚焦描边: 1px 带间隔轮廓", () => {
  it.each(OUTLINE_CONTROL_CASES)("$name 聚焦时用轮廓, 没有外圈", (testCase) => {
    render(testCase.element);
    const classes = classesOf(testCase.find());

    expect(classes).toEqual(
      expect.arrayContaining(testCase.outline.split(" ")),
    );
    expectNoClassContaining(testCase.find(), [
      ...RING_FRAGMENTS,
      "ring-destructive",
    ]);
  });

  it("字段卡片标签聚焦时沿用边框变色, 没有外圈, 没有轮廓", () => {
    render(<FieldLabel>名称</FieldLabel>);
    const classes = classesOf(screen.getByText("名称"));

    expect(classes).toContain(
      "has-[>[data-slot=field]]:has-[:focus-visible]:border-ring",
    );
    expectNoClassContaining(screen.getByText("名称"), [
      ...RING_FRAGMENTS,
      "focus-visible:outline",
    ]);
  });
});

describe("聚焦轮廓常量", () => {
  it("轮廓宽 1px, 实线, 与控件隔 2px, 取聚焦色", () => {
    expect(FOCUS_OUTLINE.split(" ")).toEqual([
      "focus-visible:outline-1",
      "focus-visible:outline-solid",
      "focus-visible:outline-offset-2",
      "focus-visible:outline-ring",
    ]);
  });

  it("铺满容器的控件向内缩, 与外轮廓宽度一致", () => {
    expect(INSET_FOCUS_OUTLINE.split(" ")).toEqual([
      "focus-visible:outline-1",
      "focus-visible:outline-solid",
      "focus-visible:-outline-offset-2",
      "focus-visible:outline-ring",
    ]);
  });

  it("破坏性变体只换颜色, 并用重要性后缀压过基础类", () => {
    expect(DESTRUCTIVE_FOCUS_OUTLINE_COLOR).toBe(
      "focus-visible:outline-destructive!",
    );
  });

  it("字段卡片标签里的控件关掉自身轮廓", () => {
    expect(FIELD_LABEL_FOCUS_OUTLINE_RESET).toBe(
      "group-has-[:focus-visible]/field-label:outline-0",
    );
  });
});
