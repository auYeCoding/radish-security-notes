import { useTranslation } from "react-i18next";

import { describeExportFormat } from "@shared/export/export-format-capabilities";
import {
  EXPORT_FORMAT_KEYS,
  isExportFormatKey,
  type ExportFormatKey,
} from "@shared/export/export-format-keys";

import { ChoiceOption } from "@renderer/components/choice-option";
import { RadioGroup } from "@renderer/components/ui/radio-group";

import { describeExportExclusion } from "./describe-export-loss";

/**
 * 选择导出格式的属性.
 */
interface ExportFormatChoiceProps {
  /**
   * 选中的格式.
   */
  readonly value: ExportFormatKey;
  /**
   * 选中另一种格式时的回调.
   */
  readonly onChange: (format: ExportFormatKey) => void;
}

/**
 * 选择导出格式: 一组单选卡片, 每种格式写明用途, 选中的格式下面列出它带不出的内容. 浏览器密码 CSV
 * 另外提醒用表格软件打开时的公式风险.
 * @param props 组件属性.
 * @returns 格式选择元素.
 */
export function ExportFormatChoice(
  props: ExportFormatChoiceProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { excludedContent } = describeExportFormat(props.value);
  const handleChange = (value: unknown): void => {
    if (isExportFormatKey(value)) {
      props.onChange(value);
    }
  };
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-medium">
        {t("export.options.format.heading")}
      </h3>
      <RadioGroup
        aria-label={t("export.options.format.heading")}
        value={props.value}
        onValueChange={handleChange}
      >
        {EXPORT_FORMAT_KEYS.map((key) => (
          <ChoiceOption
            key={key}
            id={`export-format-${key}`}
            value={key}
            title={t(`export.options.format.${key}.label`)}
            description={t(`export.options.format.${key}.hint`)}
          />
        ))}
      </RadioGroup>
      {excludedContent.length > 0 && (
        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
          <p>{t("export.options.exclusionsHeading")}</p>
          <ul className="list-disc ps-5">
            {excludedContent.map((reason) => (
              <li key={reason}>{describeExportExclusion(reason, t)}</li>
            ))}
          </ul>
          {props.value === "browserCsv" && (
            <p>{t("export.options.csvFormulaNotice")}</p>
          )}
        </div>
      )}
    </section>
  );
}
