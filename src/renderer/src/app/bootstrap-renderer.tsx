import { createI18nInstance } from "@shared/i18n/create-i18n-instance";
import { StrictMode } from "react";
import { I18nextProvider } from "react-i18next";
import { createRoot } from "react-dom/client";

import { App } from "@renderer/app/app";
import { syncDocumentLanguage } from "@renderer/i18n/sync-document-language";
import { installFileDropGuard } from "@renderer/lib/file-drop-guard";
import { BridgeProviders } from "@renderer/stores/bridge-providers";
import { BatchSelectionStoreProvider } from "@renderer/stores/batch-selection-store-provider";
import { EntryStoreProvider } from "@renderer/stores/entry-store-provider";
import { EntryTypeStoreProvider } from "@renderer/stores/entry-type-store-provider";
import { FolderStoreProvider } from "@renderer/stores/folder-store-provider";
import { createPreferencesStore } from "@renderer/stores/preferences-store";
import { PreferencesStoreProvider } from "@renderer/stores/preferences-store-provider";
import { TagStoreProvider } from "@renderer/stores/tag-store-provider";
import {
  createVaultStore,
  type VaultStore,
} from "@renderer/stores/vault-store";
import { VaultStoreProvider } from "@renderer/stores/vault-store-provider";
import {
  DARK_COLOR_SCHEME_QUERY,
  followSystemTheme,
} from "@renderer/theme/dark-class";
import { forceLightThemeWhilePrinting } from "@renderer/theme/print-theme";

import { createWorkspaceStores } from "./create-workspace-stores";
import { resetWorkspaceOnLock } from "./reset-workspace-on-lock";
import { watchAutoLock } from "./watch-auto-lock";

/**
 * 向主进程取保险库的启动状态, 状态是失败时再取失败信息, 建好保险库 store.
 * @returns 保险库 store.
 */
async function createInitialVaultStore(): Promise<VaultStore> {
  const bridge = window.api.vault;
  const initialStatus = await bridge.getStatus();
  const initialFailure =
    initialStatus === "failed" ? await bridge.getFailure() : undefined;
  return createVaultStore({
    bridge,
    recoveryBridge: window.api.recovery,
    initialStatus,
    initialFailure,
  });
}

/**
 * 启动渲染进程: 向主进程取偏好快照与保险库状态, 建好 i18n, 偏好 store, 保险库 store 与工作区的
 * 全部 store (条目, 自定义条目类型, 文件夹, 标签, 批量选中), 让保险库 store 跟上主进程的自动锁定,
 * 让工作区 store 跟随保险库锁定而重置,
 * 让深色类名跟随系统外观 (打印时强制浅色), 安装文件拖放守卫, 最后把根组件挂到容器上.
 * @param container 挂载根组件的容器元素.
 * @returns 挂载完成后兑现.
 */
export async function bootstrapRenderer(container: HTMLElement): Promise<void> {
  const bridge = window.api.preferences;
  const snapshot = await bridge.getSnapshot();
  const vaultStore = await createInitialVaultStore();
  const stores = createWorkspaceStores(window.api);
  resetWorkspaceOnLock(vaultStore, stores);
  watchAutoLock(vaultStore, window.api.vaultEvents);
  const i18n = await createI18nInstance({
    language: snapshot.language,
    isPseudoLocalizationEnabled: snapshot.isPseudoLocalizationEnabled,
  });
  const store = createPreferencesStore({ bridge, i18n, initial: snapshot });
  syncDocumentLanguage(document.documentElement, i18n);
  followSystemTheme(
    document.documentElement,
    window.matchMedia(DARK_COLOR_SCHEME_QUERY),
  );
  forceLightThemeWhilePrinting(document.documentElement, window);
  installFileDropGuard(document);
  createRoot(container).render(
    <StrictMode>
      <I18nextProvider i18n={i18n}>
        <PreferencesStoreProvider store={store}>
          <VaultStoreProvider store={vaultStore}>
            <EntryStoreProvider store={stores.entryStore}>
              <EntryTypeStoreProvider store={stores.entryTypeStore}>
                <FolderStoreProvider store={stores.folderStore}>
                  <TagStoreProvider store={stores.tagStore}>
                    <BatchSelectionStoreProvider
                      store={stores.batchSelectionStore}
                    >
                      <BridgeProviders api={window.api}>
                        <App />
                      </BridgeProviders>
                    </BatchSelectionStoreProvider>
                  </TagStoreProvider>
                </FolderStoreProvider>
              </EntryTypeStoreProvider>
            </EntryStoreProvider>
          </VaultStoreProvider>
        </PreferencesStoreProvider>
      </I18nextProvider>
    </StrictMode>,
  );
}
