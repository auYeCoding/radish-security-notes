/**
 * 读取二维码图片的结果, 显示时再换成当前语言的文案. 读取二维码的方法在渲染端的 store 层, 显示
 * 结果的输入框在组件层, 两侧都引用这里的定义.
 */
export type TotpImageImportStatus =
  "reading" | "read" | "unreadable" | "notTotp" | "tooLarge" | "failed";
