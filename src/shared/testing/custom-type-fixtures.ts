import type { CustomEntryType } from "../entries/custom-types/custom-entry-type-types";

/**
 * 测试用的自定义类型 "路由器": 地址 (列表摘要, 键为 account), 口令 (保密), 说明 (多行).
 */
export const ROUTER_TYPE: CustomEntryType = {
  id: "router",
  key: "custom:router",
  name: "路由器",
  fields: [
    { key: "account", name: "地址", kind: "singleLine", isSensitive: false },
    { key: "field-pass", name: "口令", kind: "singleLine", isSensitive: true },
    { key: "field-note", name: "说明", kind: "multiLine", isSensitive: false },
  ],
};
