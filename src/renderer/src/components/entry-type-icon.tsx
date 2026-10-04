import {
  BadgeCheckIcon,
  CreditCardIcon,
  DatabaseIcon,
  IdCardIcon,
  KeyIcon,
  KeyRoundIcon,
  MessagesSquareIcon,
  ServerIcon,
  ShapesIcon,
  StickyNoteIcon,
  TerminalIcon,
  WalletIcon,
  WifiIcon,
  type LucideIcon,
} from "lucide-react";

import {
  isEntryTypeKey,
  type EntryTypeKey,
} from "@shared/entries/preset-entry-types";

/**
 * 每个预设条目类型的图标. 键是完整的类型键, 新增类型时不配图标无法通过类型检查.
 */
const ENTRY_TYPE_ICONS: Readonly<Record<EntryTypeKey, LucideIcon>> = {
  login: KeyRoundIcon,
  forum: MessagesSquareIcon,
  database: DatabaseIcon,
  server: ServerIcon,
  bankCard: CreditCardIcon,
  cryptoWallet: WalletIcon,
  apiKey: KeyIcon,
  softwareLicense: BadgeCheckIcon,
  secureNote: StickyNoteIcon,
  wifi: WifiIcon,
  sshKey: TerminalIcon,
  identity: IdCardIcon,
};

/**
 * 全部自定义条目类型共用的图标.
 */
const CUSTOM_ENTRY_TYPE_ICON: LucideIcon = ShapesIcon;

/**
 * 条目类型图标的属性.
 */
interface EntryTypeIconProps {
  /**
   * 条目的类型键, 是预设类型键或自定义类型键.
   */
  readonly typeKey: string;
  /**
   * 追加给图标的类名, 用来设置尺寸.
   */
  readonly className?: string;
}

/**
 * 条目类型的图标, 只作装饰, 对读屏软件隐藏, 类型名由旁边的文字给出. 预设类型各有图标, 自定义
 * 类型共用一个图标.
 * @param props 组件属性.
 * @returns 图标元素.
 */
export function EntryTypeIcon(props: EntryTypeIconProps): React.JSX.Element {
  const Icon = isEntryTypeKey(props.typeKey)
    ? ENTRY_TYPE_ICONS[props.typeKey]
    : CUSTOM_ENTRY_TYPE_ICON;
  return <Icon aria-hidden="true" className={props.className} />;
}
