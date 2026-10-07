import { createPortal } from "react-dom";

import { RecoveryPrintSheet } from "@renderer/components/recovery-print-sheet";

/**
 * 打印套件容器上的标记属性名. 打印样式 `styles/print-recovery-kit.css` 按它判断页面里有没有套件.
 */
export const RECOVERY_PRINT_KIT_ATTRIBUTE = "data-recovery-print-kit";

/**
 * 套件容器上的属性.
 */
const PRINT_KIT_ATTRIBUTES = { [RECOVERY_PRINT_KIT_ATTRIBUTE]: "" };

/**
 * 恢复套件打印版式挂载组件的属性.
 */
interface RecoveryKeyPrintPortalProps {
  /**
   * 要打印的 24 个恢复词.
   */
  readonly words: readonly string[];
}

/**
 * 把恢复套件的打印版式挂到 body 的直接子元素上. 设置对话框与三栏主界面都不在这个容器里, 打印
 * 样式据此只留套件. 平时版式隐藏, 组件卸载时容器随之移除, 页面上不留下恢复词.
 * @param props 组件属性.
 * @returns 挂到 body 上的打印版式.
 */
export function RecoveryKeyPrintPortal(
  props: RecoveryKeyPrintPortalProps,
): React.ReactPortal {
  return createPortal(
    <div {...PRINT_KIT_ATTRIBUTES}>
      <RecoveryPrintSheet words={props.words} />
    </div>,
    document.body,
  );
}
