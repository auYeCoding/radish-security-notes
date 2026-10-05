import { useTranslation } from "react-i18next";

import {
  isImportDuplicatePolicy,
  type ImportDuplicatePolicy,
} from "@shared/import/import-types";

import { RadioGroup } from "@renderer/components/ui/radio-group";

import { ImportChoiceOption } from "./import-choice-option";

/**
 * 重复条目处理方式选择的属性.
 */
interface ImportDuplicatePolicyProps {
  /**
   * 选中的处理方式.
   */
  readonly value: ImportDuplicatePolicy;
  /**
   * 选中另一种处理方式时的回调.
   */
  readonly onChange: (policy: ImportDuplicatePolicy) => void;
}

/**
 * 重复条目的处理方式: 跳过或仍然导入两张单选卡片, 并写明重复的判定规则.
 * @param props 组件属性.
 * @returns 处理方式选择元素.
 */
export function ImportDuplicatePolicyField(
  props: ImportDuplicatePolicyProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const handleChange = (value: unknown): void => {
    if (isImportDuplicatePolicy(value)) {
      props.onChange(value);
    }
  };
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">
        {t("import.preview.duplicatePolicy.heading")}
      </p>
      <p className="text-sm text-muted-foreground">
        {t("import.preview.duplicatePolicy.description")}
      </p>
      <RadioGroup
        aria-label={t("import.preview.duplicatePolicy.heading")}
        value={props.value}
        onValueChange={handleChange}
      >
        <ImportChoiceOption
          id="import-duplicate-skip"
          value="skip"
          title={t("import.preview.duplicatePolicy.skip")}
        />
        <ImportChoiceOption
          id="import-duplicate-import"
          value="import"
          title={t("import.preview.duplicatePolicy.import")}
        />
      </RadioGroup>
    </div>
  );
}
