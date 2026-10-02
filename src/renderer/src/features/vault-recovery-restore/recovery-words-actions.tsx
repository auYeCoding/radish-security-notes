import { useTranslation } from "react-i18next";

import { Button } from "@renderer/components/ui/button";
import { Field } from "@renderer/components/ui/field";

/**
 * 恢复词表单按钮区的属性.
 */
interface RecoveryWordsActionsProps {
  /**
   * 校验是否正在执行, 执行中禁用按钮并显示处理中的文案.
   */
  readonly isPending: boolean;
  /**
   * 点击 "返回" 时的回调.
   */
  readonly onBack: () => void;
}

/**
 * 恢复词表单的按钮区: 主按钮 "验证恢复词" 与次要按钮 "返回".
 * @param props 组件属性.
 * @returns 按钮区元素.
 */
export function RecoveryWordsActions(
  props: RecoveryWordsActionsProps,
): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <Field>
      <Button type="submit" disabled={props.isPending}>
        {props.isPending
          ? t("vault.restore.words.submitting")
          : t("vault.restore.words.submit")}
      </Button>
      <Button
        type="button"
        variant="secondary"
        disabled={props.isPending}
        onClick={props.onBack}
      >
        {t("vault.restore.words.back")}
      </Button>
    </Field>
  );
}
