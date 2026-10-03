import type { EditEntryFormValues } from "@shared/entries/edit-entry-schema";
import type {
  EntryDetail,
  UpdateEntryInput,
} from "@shared/entries/entry-types";

/**
 * 把条目详情转成编辑表单的初始取值: 名称, 类型字段, 备注, 自定义字段与所属文件夹预填现值, TOTP
 * 输入留空表示保持不变, 不移除 TOTP. 自定义字段的编号不进表单, 保存时由主进程重新分配.
 * @param detail 要编辑的条目详情.
 * @returns 表单初始取值.
 */
export function createEditFormValues(detail: EntryDetail): EditEntryFormValues {
  return {
    name: detail.name,
    fields: { ...detail.fields },
    notes: detail.notes,
    customFields: detail.customFields.map((field) => ({
      label: field.label,
      value: field.value,
      isHidden: field.isHidden,
    })),
    totp: "",
    removeTotp: false,
    folderId: detail.folderId,
  };
}

/**
 * 把校验后的编辑表单取值转成交给主进程的更新输入.
 * @param values 校验后的表单取值.
 * @returns 更新输入.
 */
export function toUpdateEntryInput(
  values: EditEntryFormValues,
): UpdateEntryInput {
  return {
    name: values.name,
    fields: values.fields,
    notes: values.notes,
    customFields: values.customFields,
    totp: values.totp,
    removeTotp: values.removeTotp,
    folderId: values.folderId,
  };
}
