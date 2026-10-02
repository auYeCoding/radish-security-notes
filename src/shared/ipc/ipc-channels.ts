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
  recoveryVerifyWords: "recovery:verify-words",
  recoveryRestoreWithMasterPassword: "recovery:restore-with-master-password",
  recoveryRestoreWithoutMasterPassword:
    "recovery:restore-without-master-password",
  recoverySaveTextFile: "recovery:save-text-file",
  entriesList: "entries:list",
  entriesGet: "entries:get",
  entriesCreate: "entries:create",
  entriesCopyField: "entries:copy-field",
  entriesCopyCustomField: "entries:copy-custom-field",
  totpGetCode: "totp:get-code",
  totpRevealSecret: "totp:reveal-secret",
  totpCopyCode: "totp:copy-code",
  totpCopySecret: "totp:copy-secret",
  totpDecodeQrImage: "totp:decode-qr-image",
} as const;
