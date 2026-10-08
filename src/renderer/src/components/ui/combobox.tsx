import * as React from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { cn } from "cn";
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@renderer/components/ui/input-group";
import { ANCHORED_POPUP_MOTION } from "@renderer/components/ui/popup-motion";
import { FAST_STATE_TRANSITION } from "@renderer/components/ui/state-motion";

/**
 * 组合框的根, 管理选中值, 输入过滤与开合状态, 设置 `multiple` 即多选.
 */
const Combobox = ComboboxPrimitive.Root;

/**
 * 显示当前选中值的文字.
 * @param root0 组件属性, 含取值原生属性.
 * @returns 取值元素.
 */
function ComboboxValue({
  ...props
}: ComboboxPrimitive.Value.Props): React.JSX.Element {
  return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />;
}

/**
 * 打开列表的触发按钮, 右侧带向下箭头.
 * @param root0 组件属性, 含 className, children 与触发器原生属性.
 * @returns 触发器元素.
 */
function ComboboxTrigger({
  className,
  children,
  ...props
}: ComboboxPrimitive.Trigger.Props): React.JSX.Element {
  return (
    <ComboboxPrimitive.Trigger
      data-slot="combobox-trigger"
      className={cn("[&_svg:not([class*='size-'])]:size-4", className)}
      {...props}
    >
      {children}
      <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />
    </ComboboxPrimitive.Trigger>
  );
}

/**
 * 清空当前选择的按钮.
 * @param root0 组件属性, 含 className 与清空按钮原生属性.
 * @returns 清空按钮元素.
 */
function ComboboxClear({
  className,
  ...props
}: ComboboxPrimitive.Clear.Props): React.JSX.Element {
  return (
    <ComboboxPrimitive.Clear
      data-slot="combobox-clear"
      render={<InputGroupButton variant="ghost" size="icon-xs" />}
      className={cn(className)}
      {...props}
    >
      <XIcon className="pointer-events-none" />
    </ComboboxPrimitive.Clear>
  );
}

/**
 * 单选组合框输入框的附加属性.
 */
interface ComboboxInputExtraProps {
  /**
   * 是否显示右侧的展开按钮, 默认显示.
   */
  showTrigger?: boolean;
  /**
   * 是否显示右侧的清空按钮, 默认不显示.
   */
  showClear?: boolean;
}

/**
 * 单选组合框的输入框, 右侧可带触发按钮与清空按钮.
 * @param root0 组件属性, 含 className, children, disabled, showTrigger, showClear 与输入框原生属性.
 * @returns 输入框组元素.
 */
function ComboboxInput({
  className,
  children,
  disabled = false,
  showTrigger = true,
  showClear = false,
  ...props
}: ComboboxPrimitive.Input.Props & ComboboxInputExtraProps): React.JSX.Element {
  return (
    <InputGroup className={cn("w-auto", className)}>
      <ComboboxPrimitive.Input
        render={<InputGroupInput disabled={disabled} />}
        {...props}
      />
      <InputGroupAddon align="inline-end">
        {showTrigger && (
          <InputGroupButton
            size="icon-xs"
            variant="ghost"
            render={<ComboboxTrigger />}
            data-slot="input-group-button"
            className="group-has-data-[slot=combobox-clear]/input-group:hidden data-pressed:bg-transparent"
            disabled={disabled}
          />
        )}
        {showClear && <ComboboxClear disabled={disabled} />}
      </InputGroupAddon>
      {children}
    </InputGroup>
  );
}

/**
 * 组合框的浮层内容, 含定位与进出场样式.
 * @param root0 组件属性, 含 className, side, sideOffset, align, alignOffset, anchor 与浮层原生属性.
 * @returns 浮层元素.
 */
function ComboboxContent({
  className,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  alignOffset = 0,
  anchor,
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<
    ComboboxPrimitive.Positioner.Props,
    "side" | "align" | "sideOffset" | "alignOffset" | "anchor"
  >): React.JSX.Element {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        className="isolate z-50"
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          data-chips={!!anchor}
          className={cn(
            ANCHORED_POPUP_MOTION,
            "group/combobox-content relative max-h-(--available-height) w-(--anchor-width) max-w-(--available-width) min-w-[calc(var(--anchor-width)+--spacing(7))] origin-(--transform-origin) overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 data-[chips=true]:min-w-(--anchor-width) *:data-[slot=input-group]:m-1 *:data-[slot=input-group]:mb-0 *:data-[slot=input-group]:h-8 *:data-[slot=input-group]:border-input/30 *:data-[slot=input-group]:bg-input/30 *:data-[slot=input-group]:shadow-none",
            className,
          )}
          {...props}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

/**
 * 浮层里的选项列表, 超出高度时滚动.
 * @param root0 组件属性, 含 className 与列表原生属性.
 * @returns 列表元素.
 */
function ComboboxList({
  className,
  ...props
}: ComboboxPrimitive.List.Props): React.JSX.Element {
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      className={cn(
        "no-scrollbar max-h-[min(calc(--spacing(72)---spacing(9)),calc(var(--available-height)---spacing(9)))] scroll-py-1 overflow-y-auto overscroll-contain p-1 data-empty:p-0",
        className,
      )}
      {...props}
    />
  );
}

/**
 * 一个可选项, 选中时右侧显示对勾.
 * @param root0 组件属性, 含 className, children 与选项原生属性.
 * @returns 选项元素.
 */
function ComboboxItem({
  className,
  children,
  ...props
}: ComboboxPrimitive.Item.Props): React.JSX.Element {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        FAST_STATE_TRANSITION,
        "relative flex w-full cursor-default items-center gap-2 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground not-data-[variant=destructive]:data-highlighted:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
        }
      >
        <CheckIcon className="pointer-events-none" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  );
}

/**
 * 选项的分组.
 * @param root0 组件属性, 含 className 与分组原生属性.
 * @returns 分组元素.
 */
function ComboboxGroup({
  className,
  ...props
}: ComboboxPrimitive.Group.Props): React.JSX.Element {
  return (
    <ComboboxPrimitive.Group
      data-slot="combobox-group"
      className={cn(className)}
      {...props}
    />
  );
}

/**
 * 分组的标题.
 * @param root0 组件属性, 含 className 与标题原生属性.
 * @returns 标题元素.
 */
function ComboboxLabel({
  className,
  ...props
}: ComboboxPrimitive.GroupLabel.Props): React.JSX.Element {
  return (
    <ComboboxPrimitive.GroupLabel
      data-slot="combobox-label"
      className={cn("px-2 py-1.5 text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

/**
 * 按集合渲染选项的容器.
 * @param root0 组件属性, 含集合原生属性.
 * @returns 集合元素.
 */
function ComboboxCollection({
  ...props
}: ComboboxPrimitive.Collection.Props): React.JSX.Element {
  return (
    <ComboboxPrimitive.Collection data-slot="combobox-collection" {...props} />
  );
}

/**
 * 没有匹配选项时显示的提示.
 * @param root0 组件属性, 含 className 与提示原生属性.
 * @returns 提示元素.
 */
function ComboboxEmpty({
  className,
  ...props
}: ComboboxPrimitive.Empty.Props): React.JSX.Element {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cn(
        "hidden w-full justify-center py-2 text-center text-sm text-muted-foreground group-data-empty/combobox-content:flex",
        className,
      )}
      {...props}
    />
  );
}

/**
 * 选项之间的分隔线.
 * @param root0 组件属性, 含 className 与分隔线原生属性.
 * @returns 分隔线元素.
 */
function ComboboxSeparator({
  className,
  ...props
}: ComboboxPrimitive.Separator.Props): React.JSX.Element {
  return (
    <ComboboxPrimitive.Separator
      data-slot="combobox-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

export {
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
} from "@renderer/components/ui/combobox-chips";

export {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxSeparator,
  ComboboxTrigger,
  ComboboxValue,
};
