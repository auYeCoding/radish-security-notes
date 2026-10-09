/**
 * 应用的用户模型标识, Windows 用它归并任务栏与通知. 必须与打包配置 `electron-builder.yml` 里的 `appId`
 * 相同, 安装包创建的快捷方式才与运行中的窗口归为同一个应用, `app-identity.test.ts` 逐字核对.
 */
export const APP_USER_MODEL_ID = "io.github.auyecoding.radish-security-notes";
