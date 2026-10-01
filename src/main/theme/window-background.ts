import type { ResolvedTheme } from "@shared/preferences/theme-source";

import primitivesCss from "../../renderer/src/styles/tokens.primitives.css?raw";

/**
 * 两种明暗主题的窗口背景色在 token 原始值层中对应的自定义属性名.
 */
const WINDOW_BACKGROUND_PROPERTIES: Readonly<Record<ResolvedTheme, string>> = {
  light: "--base-surface-light",
  dark: "--base-surface-dark",
};

/**
 * 十六进制颜色字面量的正则片段.
 */
const HEX_COLOR_PATTERN = "#[0-9a-fA-F]{3,8}";

/**
 * 从样式文本中读取一个自定义属性的十六进制颜色值.
 * @param css 样式文本.
 * @param propertyName 自定义属性名, 例如 --base-surface-light.
 * @returns 十六进制颜色字面量.
 * @throws Error 样式文本中没有该属性的十六进制取值时.
 */
export function readHexCustomProperty(
  css: string,
  propertyName: string,
): string {
  const pattern = new RegExp(
    `${propertyName}\\s*:\\s*(${HEX_COLOR_PATTERN})\\s*;`,
  );
  const color = pattern.exec(css)?.[1];
  if (color === undefined) {
    throw new Error(`token 原始值层缺少十六进制取值的属性 ${propertyName}`);
  }
  return color;
}

/**
 * 读取指定明暗主题的窗口背景色, 取值与渲染进程的背景 token 同源.
 * @param resolvedTheme 明暗主题.
 * @returns 十六进制颜色字面量.
 */
export function resolveWindowBackground(resolvedTheme: ResolvedTheme): string {
  return readHexCustomProperty(
    primitivesCss,
    WINDOW_BACKGROUND_PROPERTIES[resolvedTheme],
  );
}
