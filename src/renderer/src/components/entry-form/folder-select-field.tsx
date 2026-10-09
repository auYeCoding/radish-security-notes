import { useId, useMemo } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import type { NewEntryFormValues } from "@shared/entries/new-entry-schema";
import type { FolderSummary } from "@shared/folders/folder-types";

import { Field, FieldLabel } from "@renderer/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@renderer/components/ui/select";

/**
 * 下拉里 "无文件夹" 选项的取值: 下拉的取值必须是字符串, 用它代表表单里没有所属文件夹 (`undefined`).
 */
const NO_FOLDER_VALUE = "no-folder";

/**
 * 下拉的一个选项.
 */
interface FolderItem {
  /**
   * 选项的取值, 是文件夹编号或 `NO_FOLDER_VALUE`.
   */
  readonly value: string;
  /**
   * 选项显示的文字.
   */
  readonly label: string;
}

/**
 * 条目表单里 "所属文件夹" 字段的属性.
 */
interface FolderSelectFieldProps {
  /**
   * 可选的全部文件夹, 按传入的顺序显示, 由调用方按名称排序规则排好.
   */
  readonly folders: readonly FolderSummary[];
}

/**
 * 条目表单里的 "所属文件夹" 下拉: 选项是 "无文件夹" 加全部文件夹, 选 "无文件夹" 时表单取值里不带所属.
 * 新建与编辑共用, 必须在 `FormProvider` 里使用.
 * @param props 组件属性.
 * @returns 下拉字段元素.
 */
export function FolderSelectField(
  props: FolderSelectFieldProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { control } = useFormContext<NewEntryFormValues>();
  const labelIdentifier = useId();
  const items = useMemo<readonly FolderItem[]>(
    () => [
      { value: NO_FOLDER_VALUE, label: t("entryForm.folderNone") },
      ...props.folders.map((folder) => ({
        value: folder.id,
        label: folder.name,
      })),
    ],
    [props.folders, t],
  );
  return (
    <Controller
      control={control}
      name="folderId"
      render={({ field }) => (
        <Field>
          <FieldLabel id={labelIdentifier}>
            {t("entryForm.folderLabel")}
          </FieldLabel>
          <Select
            items={items}
            value={field.value ?? NO_FOLDER_VALUE}
            onValueChange={(value) =>
              field.onChange(value === NO_FOLDER_VALUE ? undefined : value)
            }
          >
            <SelectTrigger aria-labelledby={labelIdentifier} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
    />
  );
}
