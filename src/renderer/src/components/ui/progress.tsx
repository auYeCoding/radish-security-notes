import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import { cn } from "cn";

/**
 * 进度条, 内含轨道与指示条, 可在子节点里放标签与数值.
 * @param root0 组件属性, 含 className, children, value 与进度条原生属性.
 * @returns 进度条元素.
 */
function Progress({
  className,
  children,
  value,
  ...props
}: ProgressPrimitive.Root.Props): React.JSX.Element {
  return (
    <ProgressPrimitive.Root
      value={value}
      data-slot="progress"
      className={cn("flex flex-wrap gap-3", className)}
      {...props}
    >
      {children}
      <ProgressTrack>
        <ProgressIndicator />
      </ProgressTrack>
    </ProgressPrimitive.Root>
  );
}

/**
 * 进度条的轨道.
 * @param root0 组件属性, 含 className 与轨道原生属性.
 * @returns 轨道元素.
 */
function ProgressTrack({
  className,
  ...props
}: ProgressPrimitive.Track.Props): React.JSX.Element {
  return (
    <ProgressPrimitive.Track
      className={cn(
        "relative flex h-1 w-full items-center overflow-x-hidden rounded-full bg-muted",
        className,
      )}
      data-slot="progress-track"
      {...props}
    />
  );
}

/**
 * 进度条的指示条, 宽度随进度变化, 本项目暂不接动效, 所以没有过渡.
 * @param root0 组件属性, 含 className 与指示条原生属性.
 * @returns 指示条元素.
 */
function ProgressIndicator({
  className,
  ...props
}: ProgressPrimitive.Indicator.Props): React.JSX.Element {
  return (
    <ProgressPrimitive.Indicator
      data-slot="progress-indicator"
      className={cn("h-full bg-primary", className)}
      {...props}
    />
  );
}

/**
 * 进度条的标签.
 * @param root0 组件属性, 含 className 与标签原生属性.
 * @returns 标签元素.
 */
function ProgressLabel({
  className,
  ...props
}: ProgressPrimitive.Label.Props): React.JSX.Element {
  return (
    <ProgressPrimitive.Label
      className={cn("text-sm font-medium", className)}
      data-slot="progress-label"
      {...props}
    />
  );
}

/**
 * 进度条的数值文字.
 * @param root0 组件属性, 含 className 与数值原生属性.
 * @returns 数值元素.
 */
function ProgressValue({
  className,
  ...props
}: ProgressPrimitive.Value.Props): React.JSX.Element {
  return (
    <ProgressPrimitive.Value
      className={cn(
        "ml-auto text-sm text-muted-foreground tabular-nums",
        className,
      )}
      data-slot="progress-value"
      {...props}
    />
  );
}

export {
  Progress,
  ProgressTrack,
  ProgressIndicator,
  ProgressLabel,
  ProgressValue,
};
