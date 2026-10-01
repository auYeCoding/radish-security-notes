/*
 * 首帧主题脚本. 作为阻塞脚本放在 index.html 的 head 中, 在首次绘制前按系统外观
 * 设置 html 的 dark 类名, 避免明暗闪烁. CSP 禁止内联脚本, 所以单独成文件.
 * 类名与媒体查询必须与 src/renderer/src/theme/dark-class.ts 中的常量一致,
 * 一致性由 dark-class.test.ts 校验.
 */
document.documentElement.classList.toggle(
  "dark",
  window.matchMedia("(prefers-color-scheme: dark)").matches,
);
