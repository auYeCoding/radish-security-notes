import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { PRESET_ENTRY_TYPES } from "@shared/entries/preset-entry-types";
import zh from "@shared/locales/zh.json";
import { sampleFieldValuesOf } from "@renderer/testing/entry-fixtures";
import { renderOpenedNewEntryForm } from "@renderer/testing/render-new-entry-dialog";

import { NewEntryTrigger } from "./new-entry-trigger";

describe("新建表单 逐个预设类型", () => {
  it.each(PRESET_ENTRY_TYPES)(
    "$key 的表单按类型定义的顺序显示全部字段, 名称在最前, 备注在最后",
    async (type) => {
      await renderOpenedNewEntryForm(
        <NewEntryTrigger />,
        zh.entryTypes[type.key],
      );

      const labels = [
        "名称",
        ...type.fields.map((field) => zh.entryFields[field.key]),
        "备注",
      ];
      const elements = labels.map((label) => screen.getByLabelText(label));

      for (let index = 1; index < elements.length; index += 1) {
        const position = elements[index - 1].compareDocumentPosition(
          elements[index],
        );
        expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      }
    },
  );

  it.each(PRESET_ENTRY_TYPES)(
    "$key 的字段按类型定义选输入框: 多行是多行输入, 敏感单行带显示切换",
    async (type) => {
      await renderOpenedNewEntryForm(
        <NewEntryTrigger />,
        zh.entryTypes[type.key],
      );

      for (const field of type.fields) {
        const input = screen.getByLabelText(zh.entryFields[field.key]);
        const toggle = screen.queryByRole("button", {
          name: `显示 ${zh.entryFields[field.key]}`,
        });
        expect(input.tagName).toBe(field.isMultiline ? "TEXTAREA" : "INPUT");
        expect(toggle !== null).toBe(field.isSensitive && !field.isMultiline);
      }
    },
  );
});

describe("新建表单 逐个预设类型保存", () => {
  it.each(PRESET_ENTRY_TYPES)(
    "$key 填写每个字段后保存, 带着类型与全部字段值交给桥, 新条目被选中",
    async (type) => {
      const { entryBridge, entryStore } = await renderOpenedNewEntryForm(
        <NewEntryTrigger />,
        zh.entryTypes[type.key],
      );
      const user = userEvent.setup();
      const values = sampleFieldValuesOf(type);

      await user.type(screen.getByLabelText("名称"), "样例条目");
      for (const field of type.fields) {
        await user.click(screen.getByLabelText(zh.entryFields[field.key]));
        await user.paste(values[field.key] ?? "");
      }
      await user.click(screen.getByRole("button", { name: "保存" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(entryBridge.create).toHaveBeenCalledWith({
        type: type.key,
        name: "样例条目",
        fields: values,
        notes: "",
        customFields: [],
      });
      expect(entryStore.getState().selection).toMatchObject({
        status: "ready",
        detail: { type: type.key, fields: values },
      });
    },
  );
});
