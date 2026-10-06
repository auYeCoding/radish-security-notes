/**
 * 恢复里主进程取当前语言文案时用到的键: 选择备份文件对话框的标题与类型过滤器名称. 键对应的
 * 文案写在 `shared/locales` 里, 键类型在编译期与 `zh.json` 对照.
 */
export type RestoreMessageKey =
  "restore.dialog.openTitle" | "restore.dialog.filter";
