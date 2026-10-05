import { useTranslation } from "react-i18next";

import type { ImportFailure } from "@shared/import/import-result";
import {
  IMPORT_SOURCES,
  isImportSourceKey,
  type ImportSourceKey,
} from "@shared/import/import-source-keys";

import { Alert, AlertDescription } from "@renderer/components/ui/alert";
import { Button } from "@renderer/components/ui/button";
import { DialogFooter } from "@renderer/components/ui/dialog";
import { RadioGroup } from "@renderer/components/ui/radio-group";

import { describeImportFailure } from "./describe-import-failure";
import { ImportChoiceOption } from "./import-choice-option";
import { ImportWarningAlert } from "./import-warning-alert";

/**
 * 选择来源步骤的属性.
 */
interface ImportSourceStepProps {
  /**
   * 选中的来源与文件格式.
   */
  readonly sourceKey: ImportSourceKey;
  /**
   * 上一次失败的原因, 没有失败时为 undefined.
   */
  readonly failure: ImportFailure | undefined;
  /**
   * 选中另一个来源时的回调.
   */
  readonly onSelect: (sourceKey: ImportSourceKey) => void;
  /**
   * 点 "选择文件" 时的回调.
   */
  readonly onChooseFile: () => void;
}

/**
 * 选择来源与文件格式的步骤: 一组单选卡片 (每种格式写明能带入什么), 明文风险提示, 上一次失败的原因,
 * 和 "选择文件" 按钮. 文件由主进程弹出系统对话框选择.
 * @param props 组件属性.
 * @returns 步骤元素.
 */
export function ImportSourceStep(
  props: ImportSourceStepProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const handleChange = (value: unknown): void => {
    if (isImportSourceKey(value)) {
      props.onSelect(value);
    }
  };
  return (
    <>
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">{t("import.source.heading")}</p>
        <RadioGroup
          aria-label={t("import.source.heading")}
          value={props.sourceKey}
          onValueChange={handleChange}
        >
          {IMPORT_SOURCES.map((source) => (
            <ImportChoiceOption
              key={source.key}
              id={`import-source-${source.key}`}
              value={source.key}
              title={t(`import.source.options.${source.key}.label`)}
              description={t(`import.source.options.${source.key}.hint`)}
            />
          ))}
        </RadioGroup>
        <ImportWarningAlert
          title={t("import.source.plaintextWarning.title")}
          description={t("import.source.plaintextWarning.description")}
        />
        {props.failure !== undefined && (
          <Alert variant="destructive">
            <AlertDescription>
              {describeImportFailure(props.failure, t)}
            </AlertDescription>
          </Alert>
        )}
      </div>
      <DialogFooter>
        <Button onClick={props.onChooseFile}>
          {t("import.source.choose")}
        </Button>
      </DialogFooter>
    </>
  );
}
