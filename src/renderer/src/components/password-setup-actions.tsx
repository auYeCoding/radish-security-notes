import { Button } from "@renderer/components/ui/button";
import { Field } from "@renderer/components/ui/field";

/**
 * 设置主密码表单按钮区的属性.
 */
interface PasswordSetupActionsProps {
  /**
   * 设置操作是否正在执行, 执行中禁用按钮并显示处理中的文案.
   */
  readonly isPending: boolean;
  /**
   * 主按钮的文案.
   */
  readonly submitLabel: string;
  /**
   * 执行中主按钮的文案.
   */
  readonly pendingLabel: string;
  /**
   * 次要按钮 "跳过" 的文案.
   */
  readonly skipLabel: string;
  /**
   * 点击次要按钮时的回调.
   */
  readonly onSkipRequest: () => void;
}

/**
 * 设置主密码表单的按钮区: 提交的主按钮与 "跳过主密码" 的次要按钮. 引导页与恢复页共用.
 * @param props 组件属性.
 * @returns 按钮区元素.
 */
export function PasswordSetupActions(
  props: PasswordSetupActionsProps,
): React.JSX.Element {
  return (
    <Field>
      <Button type="submit" disabled={props.isPending}>
        {props.isPending ? props.pendingLabel : props.submitLabel}
      </Button>
      <Button
        type="button"
        variant="secondary"
        disabled={props.isPending}
        onClick={props.onSkipRequest}
      >
        {props.skipLabel}
      </Button>
    </Field>
  );
}
