import { Progress } from "@renderer/components/ui/progress";

/**
 * 进度条取值的上限, 剩余时间占满整个周期时是 100.
 */
const FULL_PROGRESS = 100;

/**
 * 验证码倒计时的属性.
 */
interface TotpCountdownProps {
  /**
   * 距离换码的剩余秒数.
   */
  readonly remainingSeconds: number;
  /**
   * 换码周期, 单位秒.
   */
  readonly periodSeconds: number;
  /**
   * 是否临近换码, 临近时剩余时间加粗并出现提示文字.
   */
  readonly isEnding: boolean;
  /**
   * 剩余时间的文字, 已是当前语言的文案, 例如 "还剩 23 秒".
   */
  readonly remainingText: string;
  /**
   * 临近换码时的提示文字, 例如 "即将换码".
   */
  readonly endingText: string;
  /**
   * 进度条的无障碍名称.
   */
  readonly progressLabel: string;
}

/**
 * 验证码的倒计时: 一行剩余时间, 临近换码时加粗并出现提示文字, 下方是随剩余时间缩短的细进度条.
 * 进度每秒变化一次, 没有过渡动画.
 * @param props 组件属性.
 * @returns 倒计时元素.
 */
export function TotpCountdown(props: TotpCountdownProps): React.JSX.Element {
  const progress =
    (props.remainingSeconds / props.periodSeconds) * FULL_PROGRESS;
  return (
    <div className="flex w-full max-w-60 flex-col gap-1.5">
      <p className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
        <span className={props.isEnding ? "font-semibold text-foreground" : ""}>
          {props.remainingText}
        </span>
        {props.isEnding ? (
          <span className="font-semibold text-foreground">
            {props.endingText}
          </span>
        ) : null}
      </p>
      <Progress
        value={Math.min(FULL_PROGRESS, Math.max(0, progress))}
        aria-label={props.progressLabel}
      />
    </div>
  );
}
