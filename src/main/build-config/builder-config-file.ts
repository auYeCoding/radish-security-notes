import { resolve } from "node:path";

/**
 * 打包配置文件的路径, 位于仓库根目录.
 */
export const BUILDER_CONFIG_FILE = resolve(
  __dirname,
  "../../..",
  "electron-builder.yml",
);
