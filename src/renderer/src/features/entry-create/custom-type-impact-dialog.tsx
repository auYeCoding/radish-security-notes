import { useTranslation } from "react-i18next";

import type { CustomEntryTypeField } from "@shared/entries/custom-types/custom-entry-type-types";

import { DestructiveConfirmDialog } from "@renderer/components/destructive-confirm-dialog";

import type { PendingTypeUpdate } from "./use-update-custom-type";

/**
 * 修改影响确认框的属性.
 */
interface CustomTypeImpactDialogProps {
  /**
   * 等待确认的修改.
   */
  readonly pending: PendingTypeUpdate;
  /**
   * 带确认标记的保存是否正在执行.
   */
  readonly isPending: boolean;
  /**
   * 用户点确认按钮时的回调.
   */
  readonly onConfirm: () => void;
  /**
   * 确认框要关闭时的回调, 取消或按 Esc 之后调用.
   */
  readonly onClose: () => void;
}

/**
 * 把字段名排成一句里的列表: 每个字段名加引号, 用逗号隔开.
 * @param fields 字段.
 * @returns 字段名列表文本.
 */
function fieldNamesOf(fields: readonly CustomEntryTypeField[]): string {
  return fields.map((field) => `"${field.name}"`).join(", ");
}

/**
 * 保存对自定义类型的修改前的确认框, 挂载即打开, 关闭即卸载: 写明被删字段与类型下受影响的条目数
 * (这些字段的取值会被清除且无法恢复), 以及将不再保密的字段 (取值不再默认遮掩并且可以被搜索到),
 * 用户点 "确认并保存" 才保存, 点 "返回修改" 或按 Esc 回到表单. 外观与交互由共用的破坏性操作确认框
 * 提供.
 * @param props 组件属性.
 * @returns 确认框元素.
 */
export function CustomTypeImpactDialog(
  props: CustomTypeImpactDialogProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { impact, entryCount } = props.pending;
  const sentences = [
    impact.removedFields.length > 0
      ? t("entryCreate.customType.edit.impact.removed", {
          names: fieldNamesOf(impact.removedFields),
          count: entryCount,
        })
      : undefined,
    impact.unsensitizedFields.length > 0
      ? t("entryCreate.customType.edit.impact.unsensitized", {
          names: fieldNamesOf(impact.unsensitizedFields),
        })
      : undefined,
  ].filter((sentence): sentence is string => sentence !== undefined);
  return (
    <DestructiveConfirmDialog
      title={t("entryCreate.customType.edit.impact.title")}
      description={
        sentences.length > 0
          ? sentences.join(" ")
          : t("entryCreate.customType.edit.impact.generic")
      }
      cancelLabel={t("entryCreate.customType.edit.impact.cancel")}
      confirmLabel={t("entryCreate.customType.edit.impact.confirm")}
      pendingLabel={t("entryCreate.customType.edit.impact.saving")}
      isPending={props.isPending}
      failureMessage={undefined}
      onConfirm={props.onConfirm}
      onClose={props.onClose}
    />
  );
}
