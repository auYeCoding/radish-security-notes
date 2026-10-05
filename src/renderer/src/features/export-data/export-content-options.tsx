import { useTranslation } from "react-i18next";

import { describeExportFormat } from "@shared/export/export-format-capabilities";

import { CheckboxField } from "@renderer/components/checkbox-field";

import type { ExportDraft } from "./export-draft";

/**
 * 选择导出内容的属性.
 */
interface ExportContentOptionsProps {
  /**
   * 第一步填写的内容.
   */
  readonly draft: ExportDraft;
  /**
   * 改动填写内容的回调.
   */
  readonly onChange: (changes: Partial<ExportDraft>) => void;
}

/**
 * 选择导出内容: 是否包含保密字段与 TOTP 密钥, 是否包含附件. 所选格式不能带附件时附件勾选不可改并
 * 写明原因.
 * @param props 组件属性.
 * @returns 内容选项元素.
 */
export function ExportContentOptions(
  props: ExportContentOptionsProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { draft } = props;
  const canCarryAttachments = describeExportFormat(
    draft.format,
  ).canCarryAttachments;
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-medium">
        {t("export.options.content.heading")}
      </h3>
      <CheckboxField
        label={t("export.options.content.secrets")}
        description={t("export.options.content.secretsHint")}
        isChecked={draft.includeSecrets}
        onCheckedChange={(includeSecrets) => props.onChange({ includeSecrets })}
      />
      <CheckboxField
        label={t("export.options.content.attachments")}
        description={
          canCarryAttachments
            ? t("export.options.content.attachmentsHint")
            : t("export.options.content.attachmentsUnsupported")
        }
        isChecked={canCarryAttachments && draft.includeAttachments}
        isDisabled={!canCarryAttachments}
        onCheckedChange={(includeAttachments) =>
          props.onChange({ includeAttachments })
        }
      />
    </section>
  );
}
