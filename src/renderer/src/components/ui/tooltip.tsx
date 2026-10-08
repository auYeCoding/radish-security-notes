import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { cn } from "cn";

import { ANCHORED_POPUP_MOTION } from "@renderer/components/ui/popup-motion";

/**
 * 提示框的上下文提供者, 统一设置悬停延迟, 须包在应用根部.
 * @param root0 组件属性, 含 delay 与提供者原生属性.
 * @returns 提供者元素.
 */
function TooltipProvider({
  delay = 0,
  ...props
}: TooltipPrimitive.Provider.Props): React.JSX.Element {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delay={delay}
      {...props}
    />
  );
}

/**
 * 提示框的根, 管理开合状态.
 * @param root0 组件属性, 即提示框根的原生属性.
 * @returns 提示框根元素.
 */
function Tooltip({ ...props }: TooltipPrimitive.Root.Props): React.JSX.Element {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

/**
 * 触发提示框的元素.
 * @param root0 组件属性, 即触发器的原生属性.
 * @returns 触发器元素.
 */
function TooltipTrigger({
  ...props
}: TooltipPrimitive.Trigger.Props): React.JSX.Element {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

/**
 * 提示框的浮层内容, 含箭头与进出场样式.
 * @param root0 组件属性, 含 side, sideOffset, align, alignOffset, className, children.
 * @returns 浮层元素.
 */
function TooltipContent({
  className,
  side = "top",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  children,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<
    TooltipPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >): React.JSX.Element {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            ANCHORED_POPUP_MOTION,
            "z-50 inline-flex w-fit max-w-xs origin-(--transform-origin) items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs text-background has-data-[slot=kbd]:pr-1.5 **:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:z-50 **:data-[slot=kbd]:rounded-sm",
            className,
          )}
          {...props}
        >
          {children}
          <TooltipPrimitive.Arrow className="z-50 size-2.5 translate-y-[calc(-50%-2px)] rotate-45 rounded-[2px] bg-foreground fill-foreground data-[side=bottom]:top-1 data-[side=inline-end]:top-1/2! data-[side=inline-end]:-left-1 data-[side=inline-end]:-translate-y-1/2 data-[side=inline-start]:top-1/2! data-[side=inline-start]:-right-1 data-[side=inline-start]:-translate-y-1/2 data-[side=left]:top-1/2! data-[side=left]:-right-1 data-[side=left]:-translate-y-1/2 data-[side=right]:top-1/2! data-[side=right]:-left-1 data-[side=right]:-translate-y-1/2 data-[side=top]:-bottom-2.5" />
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
