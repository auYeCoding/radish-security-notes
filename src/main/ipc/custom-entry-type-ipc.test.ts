import { describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "@shared/ipc/ipc-channels";

import type { CustomEntryTypeService } from "../entry-types/custom-entry-type-service";
import { createFakeIpcMain, type FakeIpcMain } from "../testing/fake-ipc-main";
import { registerCustomEntryTypeIpc } from "./custom-entry-type-ipc";

/**
 * 一份类型都正确的新建类型输入.
 */
const VALID_INPUT = {
  name: "路由器",
  fields: [
    { name: "地址", kind: "singleLine", isSensitive: false, isSummary: true },
    { name: "口令", kind: "singleLine", isSensitive: true, isSummary: false },
  ],
};

/**
 * 创建带间谍方法的假自定义类型服务.
 * @returns 假服务.
 */
function createFakeService(): CustomEntryTypeService {
  return {
    list: vi.fn(() => ({ ok: true, value: [] })),
    create: vi.fn(() => ({ ok: true, value: { id: "t-1" } })),
  } as unknown as CustomEntryTypeService;
}

/**
 * 注册了自定义类型 IPC 的假对象.
 */
interface RegisteredFakes {
  /**
   * 假的主进程 IPC.
   */
  readonly ipcMain: FakeIpcMain;
  /**
   * 带间谍方法的假自定义类型服务.
   */
  readonly service: CustomEntryTypeService;
}

/**
 * 注册自定义类型 IPC 并返回假 IPC 与假服务.
 * @returns 假 IPC 与假服务.
 */
function registerWithFakes(): RegisteredFakes {
  const ipcMain = createFakeIpcMain();
  const service = createFakeService();
  registerCustomEntryTypeIpc(ipcMain, service);
  return { ipcMain, service };
}

describe("registerCustomEntryTypeIpc 转发", () => {
  it("列表通道返回服务的结果", () => {
    const { ipcMain } = registerWithFakes();

    expect(ipcMain.invoke(IPC_CHANNELS.entryTypesList)).toEqual({
      ok: true,
      value: [],
    });
  });

  it("新建通道把校验过的输入交给服务, 多余的属性被丢弃", () => {
    const { ipcMain, service } = registerWithFakes();

    ipcMain.invoke(IPC_CHANNELS.entryTypesCreate, {
      ...VALID_INPUT,
      extra: "ignored",
    });

    expect(service.create).toHaveBeenCalledWith(VALID_INPUT);
  });
});

describe("registerCustomEntryTypeIpc 边界校验", () => {
  it.each([
    ["不是对象", "text"],
    ["null", null],
    ["缺少名称", { fields: VALID_INPUT.fields }],
    ["名称不是字符串", { ...VALID_INPUT, name: 1 }],
    ["字段不是数组", { ...VALID_INPUT, fields: "text" }],
    ["字段不是对象", { ...VALID_INPUT, fields: [null] }],
    [
      "字段名不是字符串",
      { ...VALID_INPUT, fields: [{ ...VALID_INPUT.fields[0], name: 1 }] },
    ],
    [
      "取值形态未知",
      { ...VALID_INPUT, fields: [{ ...VALID_INPUT.fields[0], kind: "date" }] },
    ],
    [
      "保密标记不是布尔值",
      {
        ...VALID_INPUT,
        fields: [{ ...VALID_INPUT.fields[0], isSensitive: "yes" }],
      },
    ],
    [
      "摘要标记缺失",
      {
        ...VALID_INPUT,
        fields: [{ name: "地址", kind: "singleLine", isSensitive: false }],
      },
    ],
  ])("%s时抛出错误, 不交给服务", (_title, input) => {
    const { ipcMain, service } = registerWithFakes();

    expect(() => ipcMain.invoke(IPC_CHANNELS.entryTypesCreate, input)).toThrow(
      "无效的条目内容",
    );
    expect(service.create).not.toHaveBeenCalled();
  });
});
