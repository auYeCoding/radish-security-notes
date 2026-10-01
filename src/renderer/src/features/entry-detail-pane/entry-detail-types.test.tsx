import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  PRESET_ENTRY_TYPES,
  type PresetEntryTypeDefinition,
} from "@shared/entries/preset-entry-types";
import zh from "@shared/locales/zh.json";
import { sampleEntryOf } from "@renderer/testing/entry-fixtures";
import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
} from "@renderer/testing/entry-test-environment";

import { EntryDetailPane } from "./entry-detail-pane";

/**
 * 选中某个类型的样例条目后渲染详情窗格.
 * @param type 条目类型定义.
 * @returns 渲染所用的环境.
 */
async function renderSamplePane(
  type: PresetEntryTypeDefinition,
): Promise<EntryTestEnvironment> {
  const entry = sampleEntryOf(type);
  const environment = await createEntryTestEnvironment({ entries: [entry] });
  await environment.entryStore.getState().select(entry.id);
  render(<EntryDetailPane />, { wrapper: environment.Providers });
  return environment;
}

describe("EntryDetailPane 逐个预设类型展示", () => {
  it.each(PRESET_ENTRY_TYPES)(
    "$key 标明类型, 按类型的字段顺序展示, 备注在最后",
    async (type) => {
      await renderSamplePane(type);

      const labels = Array.from(document.querySelectorAll("dt")).map(
        (term) => term.textContent,
      );

      expect(screen.getByText(zh.entryTypes[type.key])).toBeDefined();
      expect(labels).toEqual([
        ...type.fields.map((field) => zh.entryFields[field.key]),
        "备注",
      ]);
    },
  );

  it.each(PRESET_ENTRY_TYPES)(
    "$key 敏感字段默认遮罩, 点击显示后是明文, 普通字段始终明文, 多行保留换行",
    async (type) => {
      await renderSamplePane(type);
      const user = userEvent.setup();
      const entry = sampleEntryOf(type);

      for (const field of type.fields) {
        const label = zh.entryFields[field.key];
        const value = entry.fields[field.key] ?? "";
        const displayed = value.replaceAll("\n", " ");
        if (field.isSensitive) {
          expect(screen.queryByText(displayed)).toBeNull();
          expect(screen.getByText(`${label} 已隐藏`)).toBeDefined();
          await user.click(
            screen.getByRole("button", { name: `显示 ${label}` }),
          );
        }
        const shown = screen.getByText(displayed);
        expect(shown.textContent).toBe(value);
      }
    },
  );
});

describe("EntryDetailPane 逐个预设类型复制", () => {
  it.each(PRESET_ENTRY_TYPES)(
    "$key 的每个字段与备注都能复制, 条目编号与字段键交给桥, 敏感字段不必先显示",
    async (type) => {
      const { entryBridge } = await renderSamplePane(type);
      const user = userEvent.setup();
      const entry = sampleEntryOf(type);

      for (const field of type.fields) {
        const label = zh.entryFields[field.key];
        await user.click(screen.getByRole("button", { name: `复制 ${label}` }));
        expect(entryBridge.copyField).toHaveBeenLastCalledWith(
          entry.id,
          field.key,
        );
        expect(
          screen.getByRole("button", { name: `复制 ${label}` }).textContent,
        ).toBe("已复制");
      }
      await user.click(screen.getByRole("button", { name: "复制 备注" }));
      expect(entryBridge.copyField).toHaveBeenLastCalledWith(entry.id, "notes");
      expect(entryBridge.copyField).toHaveBeenCalledTimes(
        type.fields.length + 1,
      );
    },
  );
});
