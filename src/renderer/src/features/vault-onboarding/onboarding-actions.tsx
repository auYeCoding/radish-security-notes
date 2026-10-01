import { useTranslation } from "react-i18next";

import { Button } from "@renderer/components/ui/button";
import { Field } from "@renderer/components/ui/field";

/**
 * 引导表单按钮区的属性.
 */
interface OnboardingActionsProps {
  /**
   * 设置操作是否正在执行, 执行中禁用按钮并显示处理中的文案.
   */
  readonly isPending: boolean;
  /**
   * 点击 "跳过" 时的回调.
   */
  readonly onSkipRequest: () => void;
}

/**
 * 引导表单的按钮区: 主按钮 "设置主密码" 与次要按钮 "跳过".
 * @param props 组件属性.
 * @returns 按钮区元素.
 */
export function OnboardingActions(
  props: OnboardingActionsProps,
): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <Field>
      <Button type="submit" disabled={props.isPending}>
        {props.isPending
          ? t("vault.onboarding.submitting")
          : t("vault.onboarding.submit")}
      </Button>
      <Button
        type="button"
        variant="secondary"
        disabled={props.isPending}
        onClick={props.onSkipRequest}
      >
        {t("vault.onboarding.skip")}
      </Button>
    </Field>
  );
}
