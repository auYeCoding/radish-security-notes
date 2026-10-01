import "@renderer/styles/globals.css";

import { bootstrapRenderer } from "@renderer/app/bootstrap-renderer";

/**
 * 挂载根组件的容器元素.
 */
const container = document.getElementById("root");

if (container === null) {
  throw new Error("找不到挂载根组件的 #root 元素");
}

bootstrapRenderer(container).catch((error: unknown) => {
  console.error(error);
});
