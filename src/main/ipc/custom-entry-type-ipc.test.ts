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
    update: vi.fn(() => ({ ok: true, value: { id: "t-1" } })),
    remove: vi.fn(() => ({ ok: true, value: undefined })),
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

/**
 * 一份类型都正确的修改类型输入: 第一个字段是已有字段, 带字段键, 第二个是新增字段.
 */
const VALID_UPDATE_INPUT = {
  id: "t-1",
  name: "路由器",
  fields: [
    {
      key: "account",
      name: "地址",
      kind: "singleLine",
      isSensitive: false,
      isSummary: true,
    },
    { name: "口令", kind: "singleLine", isSensitive: true, isSummary: false },
  ],
  isImpactConfirmed: false,
};

describe("registerCustomEntryTypeIpc 修改与删除转发", () => {
  it("修改通道把校验过的输入交给服务, 多余的属性被丢弃, 省略字段键的字段不带键", () => {
    const { ipcMain, service } = registerWithFakes();

    ipcMain.invoke(IPC_CHANNELS.entryTypesUpdate, {
      ...VALID_UPDATE_INPUT,
      extra: "ignored",
    });

    expect(service.update).toHaveBeenCalledWith(VALID_UPDATE_INPUT);
    const [received] = vi.mocked(service.update).mock.calls[0];
    expect("key" in received.fields[1]).toBe(false);
  });

  it("删除通道把校验过的输入交给服务, 多余的属性被丢弃", () => {
    const { ipcMain, service } = registerWithFakes();

    ipcMain.invoke(IPC_CHANNELS.entryTypesRemove, {
      id: "t-1",
      isImpactConfirmed: true,
      extra: "ignored",
    });

    expect(service.remove).toHaveBeenCalledWith({
      id: "t-1",
      isImpactConfirmed: true,
    });
  });
});

describe("registerCustomEntryTypeIpc 修改与删除的边界校验", () => {
  it.each([
    ["不是对象", "text"],
    ["缺少类型编号", { ...VALID_UPDATE_INPUT, id: undefined }],
    ["类型编号不是字符串", { ...VALID_UPDATE_INPUT, id: 1 }],
    ["名称不是字符串", { ...VALID_UPDATE_INPUT, name: 1 }],
    ["字段不是数组", { ...VALID_UPDATE_INPUT, fields: "text" }],
    [
      "字段键不是字符串",
      {
        ...VALID_UPDATE_INPUT,
        fields: [{ ...VALID_UPDATE_INPUT.fields[0], key: 1 }],
      },
    ],
    [
      "取值形态未知",
      {
        ...VALID_UPDATE_INPUT,
        fields: [{ ...VALID_UPDATE_INPUT.fields[0], kind: "date" }],
      },
    ],
    ["确认标记缺失", { ...VALID_UPDATE_INPUT, isImpactConfirmed: undefined }],
    ["确认标记不是布尔值", { ...VALID_UPDATE_INPUT, isImpactConfirmed: "yes" }],
  ])("修改时%s抛出错误, 不交给服务", (_title, input) => {
    const { ipcMain, service } = registerWithFakes();

    expect(() => ipcMain.invoke(IPC_CHANNELS.entryTypesUpdate, input)).toThrow(
      "无效的条目内容",
    );
    expect(service.update).not.toHaveBeenCalled();
  });

  it.each([
    ["不是对象", null],
    ["缺少类型编号", { isImpactConfirmed: true }],
    ["类型编号不是字符串", { id: 1, isImpactConfirmed: true }],
    ["确认标记缺失", { id: "t-1" }],
    ["确认标记不是布尔值", { id: "t-1", isImpactConfirmed: 1 }],
  ])("删除时%s抛出错误, 不交给服务", (_title, input) => {
    const { ipcMain, service } = registerWithFakes();

    expect(() => ipcMain.invoke(IPC_CHANNELS.entryTypesRemove, input)).toThrow(
      "无效的条目内容",
    );
    expect(service.remove).not.toHaveBeenCalled();
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
