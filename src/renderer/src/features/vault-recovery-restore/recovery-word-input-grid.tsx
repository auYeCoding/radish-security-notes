import type { ClipboardEvent } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { NumberedWordGrid } from "@renderer/components/numbered-word-grid";
import { Input } from "@renderer/components/ui/input";
import { RECOVERY_WORD_COUNT } from "@shared/vault/recovery-words";

/**
 * 恢复词输入网格的属性.
 */
interface RecoveryWordInputGridProps {
  /**
   * 给第几个输入框 (从 0 起) 取接入表单库的注册结果.
   */
  readonly registerWord: (index: number) => UseFormRegisterReturn;
  /**
   * 校验失败的词的序号 (从 1 起), 对应输入框标红, 没有时为 undefined.
   */
  readonly invalidPosition: number | undefined;
  /**
   * 是否禁用全部输入框.
   */
  readonly isDisabled: boolean;
  /**
   * 在某个输入框里粘贴时的回调.
   */
  readonly onPasteAt: (
    index: number,
    event: ClipboardEvent<HTMLInputElement>,
  ) => void;
}

/**
 * 24 个带序号的恢复词输入框, 与展示页同样的 4 列 6 行布局. 词表只在主进程, 这里不做词表
 * 校验, 提交后由主进程指出哪个词不在词表, 对应输入框标红.
 * @param props 组件属性.
 * @returns 输入网格元素.
 */
export function RecoveryWordInputGrid(
  props: RecoveryWordInputGridProps,
): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <NumberedWordGrid
      label={t("vault.recovery.wordsLabel")}
      count={RECOVERY_WORD_COUNT}
      renderCell={(position) => (
        <Input
          {...props.registerWord(position - 1)}
          aria-label={t("vault.recovery.wordLabel", { position })}
          aria-invalid={props.invalidPosition === position}
          className="font-mono"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          disabled={props.isDisabled}
          onPaste={(event) => props.onPasteAt(position - 1, event)}
        />
      )}
    />
  );
}
