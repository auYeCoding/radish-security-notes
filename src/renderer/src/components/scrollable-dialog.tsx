import { DialogContent } from "@renderer/components/ui/dialog";
import { cn } from "@renderer/lib/class-names";

/**
 * 可滚动对话框面板的类名: 纵向排列标题, 正文与底部按钮行, 面板高度不超过视口的 11/12, 超出的部分
 * 只让正文滚动.
 */
const PANEL_CLASSES = "flex max-h-11/12 flex-col";

/**
 * 可滚动正文的类名: 正文占剩余高度并在内部纵向滚动. 四周留出 4px 内边距并用负外边距抵消, 让聚焦轮廓
 * 不被滚动区域裁掉, 版面位置不变.
 */
const BODY_CLASSES = "-m-1 flex min-h-0 flex-col overflow-y-auto p-1";

/**
 * 可滚动对话框的内容面板: 在对话框内容面板的基础上让标题与底部按钮行固定, 只有夹在中间的
 * `DialogScrollBody` 在内容过多时滚动. 属性与对话框内容面板相同.
 * @param root0 组件属性, 含 className 与对话框内容面板的其余属性.
 * @returns 内容面板元素.
 */
export function ScrollableDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof DialogContent>): React.JSX.Element {
  return <DialogContent className={cn(PANEL_CLASSES, className)} {...props} />;
}

/**
 * 可滚动对话框的正文: 放在标题与底部按钮行之间, 内容超出面板高度时自己滚动. 子元素之间的间距由调用方
 * 用 `gap-*` 类名给出.
 * @param root0 组件属性, 含 className 与容器原生属性.
 * @returns 正文元素.
 */
export function DialogScrollBody({
  className,
  ...props
}: React.ComponentProps<"div">): React.JSX.Element {
  return (
    <div
      data-slot="dialog-scroll-body"
      className={cn(BODY_CLASSES, className)}
      {...props}
    />
  );
}
