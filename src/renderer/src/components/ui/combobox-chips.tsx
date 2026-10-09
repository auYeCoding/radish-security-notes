import * as React from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { cn } from "cn";
import { XIcon } from "lucide-react";

import { Button } from "@renderer/components/ui/button";
import { FAST_STATE_TRANSITION } from "@renderer/components/ui/state-motion";

/**
 * 多选组合框里放徽章与输入框的容器.
 * @param root0 组件属性, 含 className 与容器原生属性.
 * @returns 徽章容器元素.
 */
function ComboboxChips({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof ComboboxPrimitive.Chips> &
  ComboboxPrimitive.Chips.Props): React.JSX.Element {
  return (
    <ComboboxPrimitive.Chips
      data-slot="combobox-chips"
      className={cn(
        FAST_STATE_TRANSITION,
        "flex min-h-8 flex-wrap items-center gap-1 rounded-lg border border-input bg-transparent bg-clip-padding px-2.5 py-1 text-sm focus-within:border-ring has-aria-invalid:border-destructive has-data-[slot=combobox-chip]:px-1 dark:bg-input/30",
        className,
      )}
      {...props}
    />
  );
}

/**
 * 多选组合框里徽章的附加属性.
 */
interface ComboboxChipExtraProps {
  /**
   * 是否显示移除按钮, 默认显示.
   */
  showRemove?: boolean;
  /**
   * 移除按钮的无障碍名称, 由调用方按当前语言提供.
   */
  removeLabel?: string;
}

/**
 * 多选组合框里一个已选中的徽章, 默认带移除按钮, 移除按钮的无障碍名称由 `removeLabel` 给出.
 * @param root0 组件属性, 含 className, children, showRemove, removeLabel 与徽章原生属性.
 * @returns 徽章元素.
 */
function ComboboxChip({
  className,
  children,
  showRemove = true,
  removeLabel,
  ...props
}: ComboboxPrimitive.Chip.Props & ComboboxChipExtraProps): React.JSX.Element {
  return (
    <ComboboxPrimitive.Chip
      data-slot="combobox-chip"
      className={cn(
        "flex h-[calc(--spacing(5.25))] w-fit items-center justify-center gap-1 rounded-sm bg-muted px-1.5 text-xs font-medium whitespace-nowrap text-foreground has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-disabled:opacity-50 has-data-[slot=combobox-chip-remove]:pr-0",
        className,
      )}
      {...props}
    >
      {children}
      {showRemove && (
        <ComboboxPrimitive.ChipRemove
          render={<Button variant="ghost" size="icon-xs" />}
          className="-ml-1 opacity-50 hover:opacity-100"
          data-slot="combobox-chip-remove"
          aria-label={removeLabel}
        >
          <XIcon className="pointer-events-none" />
        </ComboboxPrimitive.ChipRemove>
      )}
    </ComboboxPrimitive.Chip>
  );
}

/**
 * 多选组合框里徽章之后的输入框.
 * @param root0 组件属性, 含 className 与输入框原生属性.
 * @returns 输入框元素.
 */
function ComboboxChipsInput({
  className,
  ...props
}: ComboboxPrimitive.Input.Props): React.JSX.Element {
  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-chip-input"
      className={cn("min-w-16 flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { ComboboxChips, ComboboxChip, ComboboxChipsInput };
