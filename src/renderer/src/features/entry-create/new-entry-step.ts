import type { EntryTypeDefinition } from "@shared/entries/entry-field-types";

/**
 * 新建条目对话框所处的步骤: 选择类型, 新建自定义类型, 编辑自定义类型, 或填写所选类型的条目表单.
 */
export type NewEntryStep =
  | {
      /**
       * 步骤名: 选择类型.
       */
      readonly name: "types";
    }
  | {
      /**
       * 步骤名: 新建自定义类型.
       */
      readonly name: "typeForm";
    }
  | {
      /**
       * 步骤名: 编辑自定义类型.
       */
      readonly name: "typeEdit";
      /**
       * 要编辑的自定义类型的唯一编号.
       */
      readonly typeId: string;
    }
  | {
      /**
       * 步骤名: 填写条目.
       */
      readonly name: "entry";
      /**
       * 条目表单用的类型, 预设类型或自定义类型.
       */
      readonly type: EntryTypeDefinition;
    };

/**
 * 对话框打开时的步骤: 选择类型.
 */
export const TYPES_STEP: NewEntryStep = { name: "types" };

/**
 * 进入新建自定义类型表单的步骤.
 */
export const TYPE_FORM_STEP: NewEntryStep = { name: "typeForm" };

/**
 * 生成编辑一个自定义类型的步骤.
 * @param typeId 自定义类型的唯一编号.
 * @returns 编辑类型步骤.
 */
export function typeEditStepOf(typeId: string): NewEntryStep {
  return { name: "typeEdit", typeId };
}

/**
 * 生成填写所选类型的条目表单的步骤.
 * @param type 条目类型定义.
 * @returns 条目表单步骤.
 */
export function entryStepOf(type: EntryTypeDefinition): NewEntryStep {
  return { name: "entry", type };
}
