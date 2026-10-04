import { createI18nInstance } from "@shared/i18n/create-i18n-instance";
import { StrictMode } from "react";
import { I18nextProvider } from "react-i18next";
import { createRoot } from "react-dom/client";

import { App } from "@renderer/app/app";
import { syncDocumentLanguage } from "@renderer/i18n/sync-document-language";
import { BatchBridgeProvider } from "@renderer/stores/batch-bridge-provider";
import { createBatchSelectionStore } from "@renderer/stores/batch-selection-store";
import { BatchSelectionStoreProvider } from "@renderer/stores/batch-selection-store-provider";
import { createEntryStore } from "@renderer/stores/entry-store";
import { EntryStoreProvider } from "@renderer/stores/entry-store-provider";
import { createFolderStore } from "@renderer/stores/folder-store";
import { FolderStoreProvider } from "@renderer/stores/folder-store-provider";
import { createPreferencesStore } from "@renderer/stores/preferences-store";
import { PreferencesStoreProvider } from "@renderer/stores/preferences-store-provider";
import { createTagStore } from "@renderer/stores/tag-store";
import { TagStoreProvider } from "@renderer/stores/tag-store-provider";
import { TotpBridgeProvider } from "@renderer/stores/totp-bridge-provider";
import { createVaultStore } from "@renderer/stores/vault-store";
import { VaultStoreProvider } from "@renderer/stores/vault-store-provider";
import {
  DARK_COLOR_SCHEME_QUERY,
  followSystemTheme,
} from "@renderer/theme/dark-class";
import { forceLightThemeWhilePrinting } from "@renderer/theme/print-theme";

/**
 * 启动渲染进程: 向主进程取偏好快照与保险库状态, 建好 i18n, 偏好 store, 保险库 store, 条目 store,
 * 文件夹 store, 标签 store 与批量选中 store, 让深色类名跟随系统外观 (打印时强制浅色), 最后把根组件
 * 挂到容器上.
 * @param container 挂载根组件的容器元素.
 * @returns 挂载完成后兑现.
 */
export async function bootstrapRenderer(container: HTMLElement): Promise<void> {
  const bridge = window.api.preferences;
  const snapshot = await bridge.getSnapshot();
  const vaultBridge = window.api.vault;
  const vaultStore = createVaultStore({
    bridge: vaultBridge,
    recoveryBridge: window.api.recovery,
    initialStatus: await vaultBridge.getStatus(),
  });
  const entryStore = createEntryStore({ bridge: window.api.entries });
  const folderStore = createFolderStore({ bridge: window.api.folders });
  const tagStore = createTagStore({ bridge: window.api.tags });
  const batchSelectionStore = createBatchSelectionStore();
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
  createRoot(container).render(
    <StrictMode>
      <I18nextProvider i18n={i18n}>
        <PreferencesStoreProvider store={store}>
          <VaultStoreProvider store={vaultStore}>
            <EntryStoreProvider store={entryStore}>
              <FolderStoreProvider store={folderStore}>
                <TagStoreProvider store={tagStore}>
                  <BatchSelectionStoreProvider store={batchSelectionStore}>
                    <BatchBridgeProvider bridge={window.api.batch}>
                      <TotpBridgeProvider bridge={window.api.totp}>
                        <App />
                      </TotpBridgeProvider>
                    </BatchBridgeProvider>
                  </BatchSelectionStoreProvider>
                </TagStoreProvider>
              </FolderStoreProvider>
            </EntryStoreProvider>
          </VaultStoreProvider>
        </PreferencesStoreProvider>
      </I18nextProvider>
    </StrictMode>,
  );
}
