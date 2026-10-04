import type { EntryDetail } from "@shared/entries/entry-types";
import { ROUTER_TYPE } from "@shared/testing/custom-type-fixtures";

/**
 * 测试用的 "路由器" 类型条目: 三个字段都有值, 备注为空, 没有自定义字段, 不带 TOTP.
 */
export const ROUTER_ENTRY: EntryDetail = {
  id: "router-entry",
  name: "家里路由器",
  type: ROUTER_TYPE.key,
  account: "192.168.1.1",
  fields: {
    account: "192.168.1.1",
    "field-pass": "router-secret-pass",
    "field-note": "机房左侧\n第二行",
  },
  notes: "",
  notesFormat: "plain",
  customFields: [],
  hasTotp: false,
};
