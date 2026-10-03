import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";

import { badgeVariants } from "@renderer/components/ui/badge-variants";

/**
 * 徽章组件, 一个带变体样式的行内标记, 可经 `render` 换成别的元素.
 * @param root0 组件属性, 含 className, variant, render 与行内元素原生属性.
 * @returns 徽章元素.
 */
export function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants>): React.ReactElement {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props,
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}
