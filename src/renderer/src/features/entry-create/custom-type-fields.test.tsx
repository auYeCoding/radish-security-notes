import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { CUSTOM_ENTRY_TYPE_MAX_FIELDS } from "@shared/entries/custom-types/custom-entry-type-limits";

import {
  queryFieldRows,
  renderOpenedCustomTypeForm,
  withinFieldRow,
} from "@renderer/testing/render-custom-type-form";

import { NewEntryTrigger } from "./new-entry-trigger";

describe("新建类型表单的字段行", () => {
  it("添加字段增加一行, 删除字段减少一行, 行号随之重排", async () => {
    await renderOpenedCustomTypeForm(<NewEntryTrigger />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "添加字段" }));
    expect(queryFieldRows()).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "删除字段 1" }));
    expect(queryFieldRows()).toHaveLength(1);
    expect(screen.getByRole("group", { name: "字段 1" })).toBeDefined();
  });

  it("字段数达到上限时添加字段按钮被禁用", async () => {
    await renderOpenedCustomTypeForm(<NewEntryTrigger />);
    const user = userEvent.setup();
    const add = screen.getByRole("button", { name: "添加字段" });

    for (let count = 1; count < CUSTOM_ENTRY_TYPE_MAX_FIELDS; count += 1) {
      await user.click(add);
    }

    expect(queryFieldRows()).toHaveLength(CUSTOM_ENTRY_TYPE_MAX_FIELDS);
    expect(add).toHaveProperty("disabled", true);
  });

  it("取值形态下拉有单行文本与多行文本, 默认单行", async () => {
    await renderOpenedCustomTypeForm(<NewEntryTrigger />);
    const user = userEvent.setup();

    const kind = withinFieldRow(1).getByRole("combobox", { name: "取值形态" });
    expect(kind.textContent).toContain("单行文本");
    await user.click(kind);

    const options = await screen.findAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual([
      "单行文本",
      "多行文本",
    ]);
  });
});

describe("新建类型表单的取值形态与列表摘要", () => {
  it("已是摘要的字段改成多行后, 摘要回到不设且该字段的摘要单选被禁用", async () => {
    await renderOpenedCustomTypeForm(<NewEntryTrigger />);
    const user = userEvent.setup();

    await user.click(withinFieldRow(1).getByRole("radio"));
    await user.click(
      withinFieldRow(1).getByRole("combobox", { name: "取值形态" }),
    );
    await user.click(await screen.findByRole("option", { name: "多行文本" }));

    expect(
      screen
        .getByRole("radio", { name: "不设列表摘要" })
        .getAttribute("aria-checked"),
    ).toBe("true");
    expect(withinFieldRow(1).getByRole("radio")).toHaveProperty(
      "ariaDisabled",
      "true",
    );
  });
});

describe("新建类型表单的保密与列表摘要", () => {
  it("默认不设列表摘要, 字段可以被指定为摘要", async () => {
    await renderOpenedCustomTypeForm(<NewEntryTrigger />);
    const user = userEvent.setup();

    expect(
      screen
        .getByRole("radio", { name: "不设列表摘要" })
        .getAttribute("aria-checked"),
    ).toBe("true");
    await user.click(withinFieldRow(1).getByRole("radio"));

    expect(
      withinFieldRow(1).getByRole("radio").getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("保密字段与多行字段不能作列表摘要, 单选项被禁用", async () => {
    await renderOpenedCustomTypeForm(<NewEntryTrigger />);
    const user = userEvent.setup();

    await user.click(withinFieldRow(1).getByRole("checkbox", { name: "保密" }));
    expect(withinFieldRow(1).getByRole("radio")).toHaveProperty(
      "ariaDisabled",
      "true",
    );
  });

  it("已是摘要的字段改成保密后, 摘要回到不设", async () => {
    await renderOpenedCustomTypeForm(<NewEntryTrigger />);
    const user = userEvent.setup();

    await user.click(withinFieldRow(1).getByRole("radio"));
    await user.click(withinFieldRow(1).getByRole("checkbox", { name: "保密" }));

    expect(
      screen
        .getByRole("radio", { name: "不设列表摘要" })
        .getAttribute("aria-checked"),
    ).toBe("true");
  });
});
