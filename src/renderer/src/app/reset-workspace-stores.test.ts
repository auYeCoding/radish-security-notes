import { describe, expect, it } from "vitest";

import { folderViewOf } from "@shared/folders/folder-view";

import { INITIAL_BATCH_SELECTION_STATE } from "@renderer/stores/batch-selection-state";
import { INITIAL_ENTRY_STATE } from "@renderer/stores/entry-state";
import { INITIAL_ENTRY_TYPE_STATE } from "@renderer/stores/entry-type-state";
import { INITIAL_FOLDER_STATE } from "@renderer/stores/folder-state";
import { INITIAL_TAG_STATE } from "@renderer/stores/tag-state";
import { FORUM_ENTRY, TEST_ENTRIES } from "@renderer/testing/entry-fixtures";
import {
  createEntryTestEnvironment,
  type EntryTestEnvironment,
} from "@renderer/testing/entry-test-environment";
import { TEST_TAGS } from "@renderer/testing/tag-fixtures";

import { resetWorkspaceStores } from "./reset-workspace-stores";

/**
 * 测试里的文件夹.
 */
const TEST_FOLDER = { id: "folder-1", name: "工作" };

/**
 * 测试里的自定义条目类型.
 */
const TEST_CUSTOM_TYPE = {
  id: "type-1",
  key: "custom-router",
  name: "路由器",
  fields: [],
};

/**
 * 创建一个五个 store 都装满数据的环境: 条目已读取并选中一个 (详情含密码), 填了搜索关键字, 选了
 * 文件夹入口, 勾选了条目, 另外三个 store 也已读取.
 * @returns 装满数据的环境.
 */
async function createFilledEnvironment(): Promise<EntryTestEnvironment> {
  const environment = await createEntryTestEnvironment({
    entries: TEST_ENTRIES,
    folders: [TEST_FOLDER],
    tags: TEST_TAGS,
    customEntryTypes: [TEST_CUSTOM_TYPE],
  });
  await environment.entryStore.getState().load();
  await environment.folderStore.getState().load();
  await environment.tagStore.getState().load();
  environment.entryStore.getState().setQuery("论坛");
  environment.entryStore.getState().selectView(folderViewOf(TEST_FOLDER.id));
  await environment.entryStore.getState().select(FORUM_ENTRY.id);
  environment.batchSelectionStore.getState().toggle(FORUM_ENTRY.id);
  return environment;
}

describe("resetWorkspaceStores", () => {
  it("装满数据之后确实有数据, 否则下面的断言没有意义", async () => {
    const environment = await createFilledEnvironment();

    expect(environment.entryStore.getState().entries.length).toBeGreaterThan(0);
    expect(environment.entryStore.getState().selection.status).toBe("ready");
    expect(environment.entryStore.getState().query).toBe("论坛");
    expect(environment.entryStore.getState().view).toEqual(
      folderViewOf(TEST_FOLDER.id),
    );
    expect(environment.folderStore.getState().folders).toEqual([TEST_FOLDER]);
    expect(environment.tagStore.getState().tags).toEqual(TEST_TAGS);
    expect(environment.entryTypeStore.getState().customTypes).toEqual([
      TEST_CUSTOM_TYPE,
    ]);
    expect(environment.batchSelectionStore.getState().checkedIds.size).toBe(1);
  });

  it("条目 store 回到初始状态: 列表, 选中详情, 搜索与入口都清空", async () => {
    const environment = await createFilledEnvironment();

    resetWorkspaceStores(environment);

    expect(environment.entryStore.getState()).toMatchObject(
      INITIAL_ENTRY_STATE,
    );
    expect(environment.entryStore.getState().selection).toEqual({
      status: "none",
    });
  });

  it("自定义条目类型, 文件夹, 标签与批量选中 store 都回到初始状态", async () => {
    const environment = await createFilledEnvironment();

    resetWorkspaceStores(environment);

    expect(environment.entryTypeStore.getState()).toMatchObject(
      INITIAL_ENTRY_TYPE_STATE,
    );
    expect(environment.folderStore.getState()).toMatchObject(
      INITIAL_FOLDER_STATE,
    );
    expect(environment.tagStore.getState()).toMatchObject(INITIAL_TAG_STATE);
    expect(environment.batchSelectionStore.getState()).toMatchObject(
      INITIAL_BATCH_SELECTION_STATE,
    );
  });
});

describe("resetWorkspaceStores: 明文与重新读取", () => {
  it("重置之后内存里不再有条目详情中的密码", async () => {
    const environment = await createFilledEnvironment();

    resetWorkspaceStores(environment);

    const everything = JSON.stringify([
      environment.entryStore.getState().entries,
      environment.entryStore.getState().selection,
      environment.entryStore.getState().searchMatches ?? null,
    ]);
    const secrets = Object.values(FORUM_ENTRY.fields).filter(
      (value) => value.length > 0,
    );
    expect(secrets.length).toBeGreaterThan(0);
    secrets.forEach((secret) => expect(everything).not.toContain(secret));
  });

  it("重置不删除 store 上的动作, 之后可以重新读取", async () => {
    const environment = await createFilledEnvironment();
    resetWorkspaceStores(environment);

    await environment.entryStore.getState().load();
    await environment.folderStore.getState().load();

    expect(environment.entryStore.getState().loadStatus).toBe("ready");
    expect(environment.entryStore.getState().entries.length).toBeGreaterThan(0);
    expect(environment.folderStore.getState().folders).toEqual([TEST_FOLDER]);
  });
});
