import { useState } from "react";
import { useTranslation } from "react-i18next";

import { NumberedWordGrid } from "@renderer/components/numbered-word-grid";
import { RECOVERY_WORD_COUNT } from "@shared/vault/recovery-words";

/**
 * 打印版式的属性.
 */
interface RecoveryPrintSheetProps {
  /**
   * 要打印的 24 个恢复词.
   */
  readonly words: readonly string[];
}

/**
 * 打印版式里手写留白区的行数: 保管位置 1 行, 备注 3 行.
 */
const NOTE_LINES = [
  { labelKey: "vault.recovery.print.locationLabel", lineCount: 1 },
  { labelKey: "vault.recovery.print.notesLabel", lineCount: 3 },
] as const;

/**
 * 打印恢复套件的版式: 平时隐藏, 只在打印时出现, 此时页面上其它内容都隐藏. 包含标题与应用名,
 * 生成日期, 用法, 4 列 6 行带序号的 24 个词, 泄露警示与手写保管记录的留白, 不含主密码.
 * @param props 组件属性.
 * @returns 打印版式元素.
 */
export function RecoveryPrintSheet(
  props: RecoveryPrintSheetProps,
): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const [generatedAt] = useState(() => new Date());
  const generatedDate = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: "long",
  }).format(generatedAt);
  return (
    <section
      aria-hidden="true"
      className="hidden w-full flex-col gap-8 text-foreground print:flex"
    >
      <header className="flex flex-col gap-1 border-b border-border pb-4">
        <h2 className="text-xl font-semibold">{t("vault.recovery.title")}</h2>
        <p className="text-sm">{t("app.title")}</p>
        <p className="text-xs">
          {t("vault.recovery.generated", { date: generatedDate })}
        </p>
      </header>
      <p className="text-sm">{t("vault.recovery.usage")}</p>
      <NumberedWordGrid
        label={t("vault.recovery.wordsLabel")}
        count={RECOVERY_WORD_COUNT}
        renderCell={(position) => (
          <span className="font-mono text-base">
            {props.words[position - 1]}
          </span>
        )}
      />
      <p className="text-sm font-medium">{t("vault.recovery.warning")}</p>
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold">
          {t("vault.recovery.print.notesHeading")}
        </h3>
        {NOTE_LINES.map((note) => (
          <div key={note.labelKey} className="flex flex-col gap-6">
            <span className="text-xs">{t(note.labelKey)}</span>
            {Array.from({ length: note.lineCount }, (_, index) => (
              <div key={index} className="border-b border-border" />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
