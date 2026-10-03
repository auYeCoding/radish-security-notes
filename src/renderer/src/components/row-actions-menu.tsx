import { MoreHorizontalIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@renderer/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@renderer/components/ui/dropdown-menu";

/**
 * 行尾操作菜单的属性.
 */
interface RowActionsMenuProps {
  /**
   * 触发按钮的无障碍名称, 例如 "某某文件夹的更多操作".
   */
  readonly label: string;
  /**
   * 菜单项, 由调用方给出.
   */
  readonly children: ReactNode;
}

/**
 * 列表行末尾的 "更多" 菜单: 一个图标按钮, 点开是下拉菜单, 键盘可以聚焦并用方向键选择.
 * @param props 组件属性.
 * @returns 菜单元素.
 */
export function RowActionsMenu(props: RowActionsMenuProps): React.JSX.Element {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-xs" aria-label={props.label} />
        }
      >
        <MoreHorizontalIcon aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-36">
        {props.children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
