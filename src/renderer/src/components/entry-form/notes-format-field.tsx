import { useFormContext, useController } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { NOTES_FORMATS, isNotesFormat } from "@shared/entries/notes-format";
import type { NewEntryFormValues } from "@shared/entries/new-entry-schema";

import {
  ToggleGroup,
  ToggleGroupItem,
} from "@renderer/components/ui/toggle-group";

/**
 * 备注格式选择: 一行相连的两个按钮, 单选 "纯文本" 与 "Markdown", 选中项用主色填充, 取值绑定表单的
 * 备注格式. 重复点击已选中的格式不会取消选择. 必须在 `FormProvider` 里使用.
 * @returns 备注格式选择元素.
 */
export function NotesFormatField(): React.JSX.Element {
  const { t } = useTranslation();
  const { control } = useFormContext<NewEntryFormValues>();
  const { field } = useController({ control, name: "notesFormat" });
  return (
    <ToggleGroup
      aria-label={t("entryForm.notesFormat.label")}
      size="sm"
      spacing={0}
      value={[field.value]}
      variant="outline"
      onValueChange={(groupValue) => {
        const [selected] = groupValue;
        if (isNotesFormat(selected)) {
          field.onChange(selected);
        }
      }}
    >
      {NOTES_FORMATS.map((format) => (
        <ToggleGroupItem
          key={format}
          className="aria-pressed:bg-primary aria-pressed:text-primary-foreground"
          value={format}
        >
          {t(`entryForm.notesFormat.${format}`)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
