import { cn } from "cn";

/**
 * 骨架占位块, 内容读取期间按内容的大致形状占位, 底色缓慢明暗变化.
 * @param root0 组件属性, 含 className 与块级元素原生属性.
 * @returns 占位块元素.
 */
export function Skeleton({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}
