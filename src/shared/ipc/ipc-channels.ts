/**
 * 主进程与渲染进程之间的 IPC 通道名, 两侧都从这里引用.
 */
export const IPC_CHANNELS = {
  preferencesGetSnapshot: "preferences:get-snapshot",
  preferencesSetThemeSource: "preferences:set-theme-source",
  preferencesSetLanguage: "preferences:set-language",
  vaultGetStatus: "vault:get-status",
  vaultSetupWithMasterPassword: "vault:setup-with-master-password",
  vaultSetupWithoutMasterPassword: "vault:setup-without-master-password",
  vaultUnlock: "vault:unlock",
  entriesList: "entries:list",
  entriesGet: "entries:get",
  entriesCreate: "entries:create",
  entriesCopyField: "entries:copy-field",
  entriesCopyCustomField: "entries:copy-custom-field",
} as const;
