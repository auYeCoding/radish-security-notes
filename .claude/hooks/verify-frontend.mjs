import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { delimiter, extname, join, relative, resolve } from "node:path";

/*
 * PostToolUse 校验: 改完前端根内的文件后, 立即对该文件跑 ESLint, CSS 再跑 Stylelint.
 *
 * 动机: 骨架的硬约束 (只引语义层, 禁裸原生控件, 单向依赖, 无障碍等) 全部定义在项目的
 * ESLint 与 Stylelint 里. 编辑器与持续集成会触发它们, 但 AI 写入的当下没有反馈闭环.
 * 本钩子把校验前移到每次写入之后, 失败经 additionalContext 回灌下一轮, 让 AI 立即自纠.
 *
 * 判定一律由 lint 承担, 本脚本只负责在对的时机调对的工具, 不复写任何规则.
 * 只对 manifest.frontendRoot 下的文件生效, 路径从清单读取.
 */

/**
 * 单条命令的最长等待毫秒数.
 */
const COMMAND_TIMEOUT_MS = 90000;

/**
 * manifest 路径. 钩子以项目根为工作目录运行.
 */
const MANIFEST_FILE = join(process.cwd(), ".claude", "frontend-skeleton.json");

/**
 * npx 在包未安装且禁止自动安装时的提示, 由 npm 输出, 不随系统语言变化.
 */
const MISSING_PACKAGE_MESSAGE = /npx canceled due to missing packages/i;

/**
 * Windows 上可执行文件的候选扩展名.
 */
const EXECUTABLE_EXTENSIONS = (process.env.PATHEXT ?? "")
  .split(";")
  .filter((extension) => extension.length > 0);

/**
 * 走 ESLint 的前端源码扩展名.
 */
const ESLINT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mts",
  ".cts",
  ".mjs",
  ".cjs",
]);

/**
 * 走 Stylelint 的样式扩展名.
 */
const STYLELINT_EXTENSIONS = new Set([".css"]);

/**
 * Stylelint 配置文件的候选名. 存在才运行, 避免未配置的项目里报错.
 */
const STYLELINT_CONFIG_NAMES = [
  ".stylelintrc",
  ".stylelintrc.json",
  ".stylelintrc.yaml",
  ".stylelintrc.yml",
  ".stylelintrc.js",
  ".stylelintrc.cjs",
  ".stylelintrc.mjs",
  "stylelint.config.js",
  "stylelint.config.cjs",
  "stylelint.config.mjs",
];

/**
 * 在 PATH 中查找可执行文件, 不解析本地化的 shell 报错文案.
 * @param {string} name 命令名, 不含扩展名.
 * @returns {string | undefined} 找到的完整路径; 没有找到时为 undefined.
 */
function findExecutable(name) {
  const directories = (process.env.PATH ?? "")
    .split(delimiter)
    .filter((directory) => directory.length > 0);
  const candidates = [
    name,
    ...EXECUTABLE_EXTENSIONS.map((extension) => name + extension),
  ];
  for (const directory of directories) {
    for (const candidate of candidates) {
      const fullPath = join(directory, candidate);
      try {
        if (existsSync(fullPath) && statSync(fullPath).isFile()) {
          return fullPath;
        }
      } catch {
        continue;
      }
    }
  }
  return undefined;
}

/**
 * 读取 manifest 的 frontendRoot.
 * @returns {string | undefined} frontendRoot 相对路径; 缺失或损坏时为 undefined.
 */
function readFrontendRoot() {
  try {
    const manifest = JSON.parse(readFileSync(MANIFEST_FILE, "utf8"));
    const root = manifest.frontendRoot;
    return typeof root === "string" && root.length > 0 ? root : undefined;
  } catch {
    return undefined;
  }
}

/**
 * 判断文件是否位于 frontendRoot 下.
 * @param {string} relativePath 相对项目根的正斜杠路径.
 * @param {string} frontendRoot manifest 里的前端根.
 * @returns {boolean} 在其下时为 true.
 */
function isUnderFrontendRoot(relativePath, frontendRoot) {
  const normalizedRoot = frontendRoot.replace(/\\/g, "/").replace(/\/$/, "");
  return (
    relativePath === normalizedRoot ||
    relativePath.startsWith(`${normalizedRoot}/`)
  );
}

/**
 * 判断项目里是否存在 Stylelint 配置.
 * @returns {boolean} 存在时为 true.
 */
function hasStylelintConfig() {
  return STYLELINT_CONFIG_NAMES.some((name) =>
    existsSync(join(process.cwd(), name)),
  );
}

/**
 * 运行一条 shell 命令并收集失败信息.
 * @param {string} label 命令描述.
 * @param {string} command 完整的 shell 命令.
 * @returns {string | undefined} 失败反馈; 工具缺失或命令通过时为 undefined.
 */
function runCommand(label, command) {
  const [commandName] = command.trim().split(/\s+/);
  if (findExecutable(commandName) === undefined) {
    return undefined;
  }
  const result = spawnSync(command, {
    shell: true,
    encoding: "utf8",
    cwd: process.cwd(),
    timeout: COMMAND_TIMEOUT_MS,
    windowsHide: true,
  });
  const stderr = (result.stderr ?? "").trim();
  if (result.error || MISSING_PACKAGE_MESSAGE.test(stderr)) {
    return undefined;
  }
  if (result.status === 0) {
    return undefined;
  }
  const combined = [(result.stdout ?? "").trim(), stderr]
    .filter((section) => section.length > 0)
    .join("\n");
  return combined.length === 0
    ? `${label} 退出码 ${result.status ?? "unknown"}, 无输出.`
    : `${label} 失败 (exit ${result.status ?? "unknown"}):\n${combined}`;
}

/**
 * 输出回灌内容并结束进程.
 * @param {string} context 回灌下一轮的反馈.
 * @returns {never}
 */
function injectContext(context) {
  const output = {
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: context,
    },
  };
  process.stdout.write(JSON.stringify(output));
  process.exit(0);
}

/**
 * 读取钩子的标准输入并解析为对象.
 * @returns {object | undefined} 解析结果; 输入不是合法 JSON 时为 undefined.
 */
function readPayload() {
  try {
    return JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return undefined;
  }
}

/**
 * 按文件扩展名对文件运行对应的 lint, 收集失败反馈.
 * @param {string} filePath 被改动文件的绝对路径.
 * @returns {string[]} 失败反馈列表; 全部通过时为空数组.
 */
function collectFailures(filePath) {
  const extension = extname(filePath);
  const failures = [];
  if (ESLINT_EXTENSIONS.has(extension)) {
    failures.push(
      runCommand("ESLint", `npx --no-install eslint "${filePath}"`),
    );
  }
  if (STYLELINT_EXTENSIONS.has(extension) && hasStylelintConfig()) {
    failures.push(
      runCommand("Stylelint", `npx --no-install stylelint "${filePath}"`),
    );
  }
  return failures.filter((failure) => failure !== undefined);
}

/**
 * 钩子入口: 前端根内文件改动后运行 lint 并回灌失败.
 */
function main() {
  const frontendRoot = readFrontendRoot();
  const rawFilePath = readPayload()?.tool_input?.file_path;
  if (
    frontendRoot === undefined ||
    typeof rawFilePath !== "string" ||
    rawFilePath.length === 0
  ) {
    process.exit(0);
  }
  const filePath = resolve(rawFilePath);
  const relativePath = relative(process.cwd(), filePath).replace(/\\/g, "/");
  if (
    relativePath.startsWith("..") ||
    !isUnderFrontendRoot(relativePath, frontendRoot)
  ) {
    process.exit(0);
  }
  const failures = collectFailures(filePath);
  if (failures.length === 0) {
    process.exit(0);
  }
  injectContext(
    `[前端约束] ${relativePath} 改动后 lint 未过, 请在继续前修复:\n\n${failures.join(
      "\n\n---\n\n",
    )}\n\n若确属误报 (工具未安装或与本次改动无关的偶发), 请显式说明并征求豁免, 不要默默忽略.`,
  );
}

main();
