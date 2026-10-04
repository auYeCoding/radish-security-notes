import { Trash2Icon } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { useTranslation } from "react-i18next";

import type { CustomEntryTypeFormValues } from "@shared/entries/custom-types/custom-entry-type-schema";

import { TextField } from "@renderer/components/text-field";
import { Button } from "@renderer/components/ui/button";

import { describeCustomTypeError } from "./custom-type-errors";
import { CustomTypeKindSelect } from "./custom-type-kind-select";
import { CustomTypeSensitiveCheckbox } from "./custom-type-sensitive-checkbox";
import { CustomTypeSummaryRadio } from "./custom-type-summary-radio";

/**
 * 新建类型表单里一个字段行的属性.
 */
interface CustomTypeFieldRowProps {
  /**
   * 这个字段在字段数组里的位置, 从 0 开始.
   */
  readonly index: number;
  /**
   * 点击删除按钮时的回调.
   */
  readonly onRemove: () => void;
}

/**
 * 新建类型表单里的一个字段: 字段名, 取值形态, "保密" 勾选, "列表摘要" 单选项与删除按钮. 必须在
 * `FormProvider` 与摘要单选组里使用, 字段名的错误显示在字段名下方.
 * @param props 组件属性.
 * @returns 字段行元素.
 */
export function CustomTypeFieldRow(
  props: CustomTypeFieldRowProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { register, formState } = useFormContext<CustomEntryTypeFormValues>();
  const { index } = props;
  const position = index + 1;
  return (
    <div
      role="group"
      aria-label={t("entryCreate.customType.fieldGroup", { index: position })}
      className="flex flex-col gap-3 rounded-xl border border-border p-3"
    >
      <TextField
        {...register(`fields.${index}.name`)}
        label={t("entryCreate.customType.fieldNameLabel")}
        autoComplete="off"
        error={describeCustomTypeError(
          formState.errors.fields?.[index]?.name?.message,
          t,
        )}
      />
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <CustomTypeKindSelect index={index} />
        <CustomTypeSensitiveCheckbox index={index} />
        <CustomTypeSummaryRadio index={index} />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="ml-auto"
          aria-label={t("entryCreate.customType.removeField", {
            index: position,
          })}
          onClick={props.onRemove}
        >
          <Trash2Icon aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
