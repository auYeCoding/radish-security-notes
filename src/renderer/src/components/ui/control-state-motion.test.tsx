import { render, screen } from "@testing-library/react";
import { describe, it } from "vitest";

import { Badge } from "@renderer/components/ui/badge";
import { Button } from "@renderer/components/ui/button";
import { Checkbox } from "@renderer/components/ui/checkbox";
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
import {
  expectMotionClasses,
  expectNoClassContaining,
} from "@renderer/testing/expect-motion-classes";

import {
  BASE_STATE_TRANSITION,
  BASE_TRANSFORM_TRANSITION,
  FAST_STATE_TRANSITION,
  MARK_TRANSITION,
} from "./state-motion";

/**
 * 一个取快档状态过渡的控件用例.
 */
interface FastControlCase {
  /**
   * 控件名称, 作为用例标题.
   */
  name: string;
  /**
   * 要渲染的元素.
   */
  element: React.ReactElement;
  /**
   * 渲染后找到带过渡类名的元素.
   */
  find: () => Element | null;
}

/**
 * 全部取快档状态过渡的控件.
 */
const FAST_CONTROL_CASES: readonly FastControlCase[] = [
  {
    name: "按钮",
    element: <Button>保存</Button>,
    find: () => screen.getByRole("button", { name: "保存" }),
  },
  {
    name: "切换按钮",
    element: <Toggle>粗体</Toggle>,
    find: () => screen.getByRole("button", { name: "粗体" }),
  },
  {
    name: "切换按钮分组里的按钮",
    element: (
      <ToggleGroup>
        <ToggleGroupItem value="left">靠左</ToggleGroupItem>
      </ToggleGroup>
    ),
    find: () => screen.getByRole("button", { name: "靠左" }),
  },
  {
    name: "徽章",
    element: <Badge>标签</Badge>,
    find: () => screen.getByText("标签"),
  },
  {
    name: "单行输入框",
    element: <Input aria-label="名称" />,
    find: () => screen.getByRole("textbox", { name: "名称" }),
  },
  {
    name: "多行输入框",
    element: <Textarea aria-label="备注" />,
    find: () => screen.getByRole("textbox", { name: "备注" }),
  },
  {
    name: "输入框组",
    element: (
      <InputGroup>
        <InputGroupInput aria-label="搜索" />
      </InputGroup>
    ),
    find: () => screen.getByRole("group"),
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
  },
  {
    name: "可滚动区域的视口",
    element: <ScrollArea>内容</ScrollArea>,
    find: () => document.querySelector("[data-slot=scroll-area-viewport]"),
  },
];

describe("控件的状态过渡: 快档", () => {
  it.each(FAST_CONTROL_CASES)(
    "$name 取快档, 不用 transition-all",
    (testCase) => {
      render(testCase.element);

      expectMotionClasses(testCase.find(), FAST_STATE_TRANSITION);
      expectNoClassContaining(testCase.find(), [
        "transition-all",
        "transition-[",
      ]);
    },
  );
});

describe("控件的状态过渡: 开关, 勾选, 单选", () => {
  it("开关的轨道与滑块取基础档", () => {
    render(<Switch aria-label="自动备份" />);

    expectMotionClasses(
      screen.getByRole("switch", { name: "自动备份" }),
      BASE_STATE_TRANSITION,
    );
    expectMotionClasses(
      document.querySelector("[data-slot=switch-thumb]"),
      BASE_TRANSFORM_TRANSITION,
    );
  });

  it("勾选框的根取快档, 选中后对勾标记有出现与消失过渡", () => {
    render(<Checkbox aria-label="同意" defaultChecked />);

    expectMotionClasses(
      screen.getByRole("checkbox", { name: "同意" }),
      FAST_STATE_TRANSITION,
    );
    const indicator = document.querySelector("[data-slot=checkbox-indicator]");
    expectMotionClasses(indicator, MARK_TRANSITION);
    expectNoClassContaining(indicator, ["transition-none"]);
  });

  it("单选项的根取快档, 选中后圆点标记有出现与消失过渡", () => {
    render(
      <RadioGroup defaultValue="a">
        <RadioGroupItem value="a" aria-label="甲" />
      </RadioGroup>,
    );

    expectMotionClasses(
      screen.getByRole("radio", { name: "甲" }),
      FAST_STATE_TRANSITION,
    );
    expectMotionClasses(
      document.querySelector("[data-slot=radio-group-indicator]"),
      MARK_TRANSITION,
    );
  });
});
