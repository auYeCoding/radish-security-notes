import { useMemo } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

import { Label } from "@renderer/components/ui/label";
import { Separator } from "@renderer/components/ui/separator";

/**
 * 字段的图例属性.
 */
interface FieldLegendProps {
  /**
   * 图例的外观: 作为分组标题的 legend, 或与标签同样大小的 label.
   */
  variant?: "legend" | "label";
}

/**
 * 字段分隔线的属性.
 */
interface FieldSeparatorProps {
  /**
   * 显示在分隔线中间的内容.
   */
  children?: React.ReactNode;
}

/**
 * 一条校验错误.
 */
interface FieldErrorItem {
  /**
   * 错误消息.
   */
  message?: string;
}

/**
 * 字段错误的属性.
 */
interface FieldErrorProps {
  /**
   * 校验错误列表, 没有给 children 时按它渲染, 重复的消息只显示一次.
   */
  errors?: Array<FieldErrorItem | undefined>;
}

/**
 * 字段的方向变体样式.
 */
const fieldVariants = cva(
  "group/field flex w-full gap-2 data-[invalid=true]:text-destructive",
  {
    variants: {
      orientation: {
        vertical: "flex-col *:w-full [&>.sr-only]:w-auto",
        horizontal:
          "flex-row items-center has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
        responsive:
          "flex-col *:w-full @md/field-group:flex-row @md/field-group:items-center @md/field-group:*:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:*:data-[slot=field-label]:flex-auto [&>.sr-only]:w-auto @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
      },
    },
    defaultVariants: {
      orientation: "vertical",
    },
  },
);

/**
 * 字段集, 把一组相关字段包进原生 fieldset.
 * @param root0 组件属性, 含 className 与 fieldset 原生属性.
 * @returns 字段集元素.
 */
function FieldSet({
  className,
  ...props
}: React.ComponentProps<"fieldset">): React.JSX.Element {
  return (
    <fieldset
      data-slot="field-set"
      className={cn(
        "flex flex-col gap-4 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3",
        className,
      )}
      {...props}
    />
  );
}

/**
 * 字段集的图例.
 * @param root0 组件属性, 含 className, variant 与 legend 原生属性.
 * @returns 图例元素.
 */
function FieldLegend({
  className,
  variant = "legend",
  ...props
}: React.ComponentProps<"legend"> & FieldLegendProps): React.JSX.Element {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className={cn(
        "mb-1.5 font-medium data-[variant=label]:text-sm data-[variant=legend]:text-base",
        className,
      )}
      {...props}
    />
  );
}

/**
 * 字段组, 纵向排列多个字段并统一间距.
 * @param root0 组件属性, 含 className 与容器原生属性.
 * @returns 字段组元素.
 */
function FieldGroup({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      data-slot="field-group"
      className={cn(
        "group/field-group @container/field-group flex w-full flex-col gap-5 data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-4",
        className,
      )}
      {...props}
    />
  );
}

/**
 * 字段: 一个标签, 一个控件与可选的说明, 错误组成的单元.
 * @param root0 组件属性, 含 className, orientation 与容器原生属性.
 * @returns 字段元素.
 */
function Field({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof fieldVariants>): React.JSX.Element {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={cn(fieldVariants({ orientation }), className)}
      {...props}
    />
  );
}

/**
 * 字段的内容区, 横向字段里放标签与说明.
 * @param root0 组件属性, 含 className 与容器原生属性.
 * @returns 内容区元素.
 */
function FieldContent({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      data-slot="field-content"
      className={cn(
        "group/field-content flex flex-1 flex-col gap-0.5 leading-snug",
        className,
      )}
      {...props}
    />
  );
}

/**
 * 字段的标签.
 * @param root0 组件属性, 含 className 与标签原生属性.
 * @returns 标签元素.
 */
function FieldLabel({
  className,
  ...props
}: React.ComponentProps<typeof Label>): React.JSX.Element {
  return (
    <Label
      data-slot="field-label"
      className={cn(
        "group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50 has-data-checked:border-primary/30 has-data-checked:bg-primary/5 has-[>[data-slot=field]]:rounded-lg has-[>[data-slot=field]]:border has-[>[data-slot=field]]:not-has-[:disabled,[data-disabled]]:hover:bg-muted/50 has-[>[data-slot=field]]:has-[:focus-visible]:border-ring *:data-[slot=field]:p-2.5 dark:has-data-checked:border-primary/20 dark:has-data-checked:bg-primary/10",
        "has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col",
        className,
      )}
      {...props}
    />
  );
}

/**
 * 字段的标题, 不是 label 元素, 用于不需要关联控件的标题文字.
 * @param root0 组件属性, 含 className 与容器原生属性.
 * @returns 标题元素.
 */
function FieldTitle({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      data-slot="field-label"
      className={cn(
        "flex w-fit items-center gap-2 text-sm font-medium group-data-[disabled=true]/field:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

/**
 * 字段的说明文字.
 * @param root0 组件属性, 含 className 与段落原生属性.
 * @returns 说明元素.
 */
function FieldDescription({
  className,
  ...props
}: React.ComponentProps<"p">): React.JSX.Element {
  return (
    <p
      data-slot="field-description"
      className={cn(
        "text-left text-sm leading-normal font-normal text-muted-foreground group-has-data-horizontal/field:text-balance [[data-variant=legend]+&]:-mt-1.5",
        "last:mt-0 nth-last-2:-mt-1",
        "[&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary",
        className,
      )}
      {...props}
    />
  );
}

/**
 * 字段之间的分隔线, 可在中间放文字.
 * @param root0 组件属性, 含 children, className 与容器原生属性.
 * @returns 分隔线元素.
 */
function FieldSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & FieldSeparatorProps): React.JSX.Element {
  return (
    <div
      data-slot="field-separator"
      data-content={!!children}
      className={cn(
        "relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2",
        className,
      )}
      {...props}
    >
      <Separator className="absolute inset-0 top-1/2" />
      {children && (
        <span
          className="relative mx-auto block w-fit bg-background px-2 text-muted-foreground"
          data-slot="field-separator-content"
        >
          {children}
        </span>
      )}
    </div>
  );
}

/**
 * 字段的错误消息, 带 `role="alert"`, 出现时屏幕阅读器会立即朗读. 没有内容时不渲染.
 * @param root0 组件属性, 含 className, children, errors 与容器原生属性.
 * @returns 错误元素, 没有错误时为 null.
 */
function FieldError({
  className,
  children,
  errors,
  ...props
}: React.ComponentProps<"div"> & FieldErrorProps): React.JSX.Element | null {
  const content = useMemo(() => {
    if (children) {
      return children;
    }

    if (!errors?.length) {
      return null;
    }

    const uniqueErrors = [
      ...new Map(errors.map((error) => [error?.message, error])).values(),
    ];

    if (uniqueErrors?.length === 1) {
      return uniqueErrors[0]?.message;
    }

    return (
      <ul className="ml-4 flex list-disc flex-col gap-1">
        {uniqueErrors.map(
          (error, index) =>
            error?.message && <li key={index}>{error.message}</li>,
        )}
      </ul>
    );
  }, [children, errors]);

  if (!content) {
    return null;
  }

  return (
    <div
      role="alert"
      data-slot="field-error"
      className={cn("text-sm font-normal text-destructive", className)}
      {...props}
    >
      {content}
    </div>
  );
}

export {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldContent,
  FieldTitle,
};
