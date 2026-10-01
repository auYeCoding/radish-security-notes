import * as React from "react";
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { type VariantProps } from "class-variance-authority";
import { cn } from "cn";

import { toggleVariants } from "@renderer/components/ui/toggle-variants";

/**
 * 切换按钮分组的排布属性.
 */
interface ToggleGroupLayoutProps {
  /**
   * 按钮之间的间距, 单位是间距刻度, 0 时按钮相连.
   */
  spacing?: number;
  /**
   * 排列方向.
   */
  orientation?: "horizontal" | "vertical";
}

/**
 * 分组向其中的切换按钮传递变体, 尺寸, 间距与方向的上下文取值.
 */
type ToggleGroupContextValue = VariantProps<typeof toggleVariants> &
  ToggleGroupLayoutProps;

/**
 * 分组向其中的切换按钮传递变体, 尺寸, 间距与方向的上下文.
 */
const ToggleGroupContext = React.createContext<ToggleGroupContextValue>({
  size: "default",
  variant: "default",
  spacing: 2,
  orientation: "horizontal",
});

/**
 * 切换按钮分组, 基于 Base UI 的 ToggleGroup, 统一设置变体, 尺寸, 间距与方向.
 * @param root0 组件属性, 含 className, variant, size, spacing, orientation, children 与分组原生属性.
 * @returns 切换按钮分组元素.
 */
function ToggleGroup({
  className,
  variant,
  size,
  spacing = 2,
  orientation = "horizontal",
  children,
  ...props
}: ToggleGroupPrimitive.Props & ToggleGroupContextValue): React.JSX.Element {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      data-variant={variant}
      data-size={size}
      data-spacing={spacing}
      data-orientation={orientation}
      style={{ "--gap": spacing } as React.CSSProperties}
      className={cn(
        "group/toggle-group flex w-fit flex-row items-center gap-[--spacing(var(--gap))] rounded-lg data-[size=sm]:rounded-[min(var(--radius-md),10px)] data-vertical:flex-col data-vertical:items-stretch",
        className,
      )}
      {...props}
    >
      <ToggleGroupContext.Provider
        value={{ variant, size, spacing, orientation }}
      >
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive>
  );
}

/**
 * 切换按钮分组里的单个按钮, 变体与尺寸优先取分组的设置.
 * @param root0 组件属性, 含 className, children, variant, size 与切换按钮原生属性.
 * @returns 分组内的切换按钮元素.
 */
function ToggleGroupItem({
  className,
  children,
  variant = "default",
  size = "default",
  ...props
}: TogglePrimitive.Props &
  VariantProps<typeof toggleVariants>): React.JSX.Element {
  const context = React.useContext(ToggleGroupContext);

  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      data-variant={context.variant || variant}
      data-size={context.size || size}
      data-spacing={context.spacing}
      className={cn(
        "shrink-0 group-data-[spacing=0]/toggle-group:rounded-none group-data-[spacing=0]/toggle-group:px-2 focus:z-10 focus-visible:z-10 group-data-[spacing=0]/toggle-group:has-data-[icon=inline-end]:pr-1.5 group-data-[spacing=0]/toggle-group:has-data-[icon=inline-start]:pl-1.5 group-data-horizontal/toggle-group:data-[spacing=0]:first:rounded-l-lg group-data-vertical/toggle-group:data-[spacing=0]:first:rounded-t-lg group-data-horizontal/toggle-group:data-[spacing=0]:last:rounded-r-lg group-data-vertical/toggle-group:data-[spacing=0]:last:rounded-b-lg group-data-horizontal/toggle-group:data-[spacing=0]:data-[variant=outline]:border-l-0 group-data-vertical/toggle-group:data-[spacing=0]:data-[variant=outline]:border-t-0 group-data-horizontal/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-l group-data-vertical/toggle-group:data-[spacing=0]:data-[variant=outline]:first:border-t",
        toggleVariants({
          variant: context.variant || variant,
          size: context.size || size,
        }),
        className,
      )}
      {...props}
    >
      {children}
    </TogglePrimitive>
  );
}

export { ToggleGroup, ToggleGroupItem };
