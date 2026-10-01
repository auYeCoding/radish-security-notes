/**
 * 主进程与渲染进程之间的 IPC 通道名, 两侧都从这里引用.
 */
export const IPC_CHANNELS = {
  preferencesGetSnapshot: "preferences:get-snapshot",
  preferencesSetThemeSource: "preferences:set-theme-source",
  preferencesSetLanguage: "preferences:set-language",
} as const;
