import { NotFilledText } from "./detail-field";

/**
 * 遮罩时显示的圆点, 个数固定, 不暴露内容的长度.
 */
const MASKED_VALUE = "•".repeat(8);

/**
 * 遮罩值的属性.
 */
interface SecretValueProps {
  /**
   * 字段的值. 空串表示没有填写, undefined 表示有值但还没有取到明文, 这两种情形之外的值
   * 是明文.
   */
  readonly value: string | undefined;
  /**
   * 是否显示明文.
   */
  readonly isRevealed: boolean;
  /**
   * 遮罩时只给读屏软件读的文字.
   */
  readonly hiddenText: string;
}

/**
 * 遮罩行的展示值: 没有填写时是辅助文字, 默认是固定个数的圆点, 点击显示按钮后是按原有换行
 * 完整显示的等宽明文.
 * @param props 值, 是否显示明文与遮罩时的读屏文字.
 * @returns 展示值元素.
 */
export function SecretValue(props: SecretValueProps): React.JSX.Element {
  if (props.value === "") {
    return <NotFilledText />;
  }
  if (props.isRevealed && props.value !== undefined) {
    return <span className="font-mono whitespace-pre-wrap">{props.value}</span>;
  }
  return (
    <>
      <span aria-hidden="true" className="font-mono">
        {MASKED_VALUE}
      </span>
      <span className="sr-only">{props.hiddenText}</span>
    </>
  );
}
