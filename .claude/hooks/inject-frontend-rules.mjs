import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";

/*
 * PreToolUse 注入: 写前端组件或页面文件的当下, 注入软约束清单.
 *
 * 动机: 复用比例, 2 次抽象, 禁手搓等价控件这类规则无法被 lint 可靠判定, 只能靠提醒,
 * 而放在 CLAUDE.md 里的提醒会随上下文增长失去注意力. 本钩子在命中前端相关文件的
 * Write 与 Edit 时, 就地注入 .claude/frontend-rules.md 的正文, 首次给全文, 之后只给
 * 一句提醒, 会话内去重, 让提醒紧邻当前动作又不刷屏.
 *
 * 匹配范围来自 frontend-rules.md 的 paths 声明, 本脚本不假设任何目录.
 */

/**
 * 项目 .claude 目录. 钩子以项目根为工作目录运行.
 */
const CLAUDE_DIRECTORY = join(process.cwd(), ".claude");

/**
 * 软规则正文文件.
 */
const RULES_FILE = join(CLAUDE_DIRECTORY, "frontend-rules.md");

/**
 * 记录本会话是否已注入过的状态目录.
 */
const STATE_DIRECTORY = join(tmpdir(), "claude-frontend-rules");

/**
 * 标记文件的保留期. 标记以会话为单位, 会话结束即成垃圾, 而 Windows 的临时目录
 * 不会自动清理, 所以每次运行顺手回收过期项.
 */
const MARKER_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * frontmatter 的分隔线.
 */
const FRONTMATTER_DELIMITER = "---";

/**
 * frontmatter 中的列表项, 例如 `  - "src/**"`.
 */
const LIST_ITEM = /^\s*-\s*["']?(.+?)["']?\s*$/;

/**
 * 首次之后的单句提醒.
 */
const SHORT_REMINDER =
  "提醒: 正在写前端组件或页面, 落笔前按 .claude/frontend-rules.md 自检 (优先复用库与已封装组件, 禁手搓等价控件, 2 次即抽象, 样式走 token, 文案走 i18n).";

/**
 * 把 glob 模式编译成正则. 只支持规则文件里用到的 `**` 与 `*`.
 * @param {string} pattern glob 模式.
 * @returns {RegExp} 匹配完整相对路径的正则.
 */
function compileGlob(pattern) {
  const escaped = pattern.replace(/[.+^${}()[\]\\|]/g, "\\$&");
  const expanded = escaped
    .replace(/\*\*\//g, "(?:.*/)?")
    .replace(/\*\*/g, ".*")
    .replace(/(?<!\.)\*/g, "[^/]*");
  return new RegExp(`^${expanded}$`, "i");
}

/**
 * 解析规则文件 frontmatter 中的 paths 列表.
 * @param {string} content 规则文件全文.
 * @returns {string[]} paths 声明的 glob 模式; 没有 frontmatter 时为空数组.
 */
function parsePathPatterns(content) {
  const lines = content.split(/\r?\n/);
  if (lines[0]?.trim() !== FRONTMATTER_DELIMITER) {
    return [];
  }
  const patterns = [];
  let isInsidePaths = false;
  for (const line of lines.slice(1)) {
    if (line.trim() === FRONTMATTER_DELIMITER) {
      break;
    }
    if (/^paths\s*:/.test(line)) {
      isInsidePaths = true;
      continue;
    }
    if (isInsidePaths) {
      const matched = LIST_ITEM.exec(line);
      if (matched === null) {
        isInsidePaths = false;
        continue;
      }
      patterns.push(matched[1]);
    }
  }
  return patterns;
}

/**
 * 取规则文件正文, 去掉 frontmatter.
 * @param {string} content 规则文件全文.
 * @returns {string} 正文.
 */
function stripFrontmatter(content) {
  const lines = content.split(/\r?\n/);
  if (lines[0]?.trim() !== FRONTMATTER_DELIMITER) {
    return content;
  }
  const end = lines.indexOf(FRONTMATTER_DELIMITER, 1);
  return end === -1
    ? content
    : lines
        .slice(end + 1)
        .join("\n")
        .trim();
}

/**
 * 删除超过保留期的标记文件, 逐项容错.
 */
function pruneExpiredMarkers() {
  const now = Date.now();
  for (const entry of readdirSync(STATE_DIRECTORY)) {
    const markerPath = join(STATE_DIRECTORY, entry);
    try {
      if (now - statSync(markerPath).mtimeMs > MARKER_RETENTION_MS) {
        rmSync(markerPath, { force: true });
      }
    } catch {
      continue;
    }
  }
}

/**
 * 判断本会话是否已注入过, 没有则登记.
 * @param {string} sessionId 会话标识.
 * @returns {boolean} 此前已注入过时为 true.
 */
function hasInjectedBefore(sessionId) {
  const marker = join(STATE_DIRECTORY, sessionId);
  if (existsSync(marker)) {
    return true;
  }
  writeFileSync(marker, "");
  return false;
}

/**
 * 输出注入内容并结束进程.
 * @param {string} context 注入到模型上下文的文本.
 * @returns {never}
 */
function injectContext(context) {
  const output = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
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
 * 把待写文件路径换算成相对项目根的正斜杠路径.
 * @param {string} filePath 待写文件路径.
 * @returns {string | undefined} 相对路径; 文件在项目外时为 undefined.
 */
function toProjectRelativePath(filePath) {
  const relativePath = relative(process.cwd(), resolve(filePath)).replace(
    /\\/g,
    "/",
  );
  return relativePath.startsWith("..") ? undefined : relativePath;
}

/**
 * 钩子入口: 按待写文件路径匹配前端软规则并注入.
 */
function main() {
  if (!existsSync(RULES_FILE)) {
    process.exit(0);
  }
  const payload = readPayload();
  const filePath = payload?.tool_input?.file_path ?? "";
  if (filePath.length === 0) {
    process.exit(0);
  }
  const relativePath = toProjectRelativePath(filePath);
  if (relativePath === undefined) {
    process.exit(0);
  }
  const content = readFileSync(RULES_FILE, "utf8");
  const isMatch = parsePathPatterns(content).some((pattern) =>
    compileGlob(pattern).test(relativePath),
  );
  if (!isMatch) {
    process.exit(0);
  }
  mkdirSync(STATE_DIRECTORY, { recursive: true });
  pruneExpiredMarkers();
  if (hasInjectedBefore(payload.session_id ?? "unknown")) {
    injectContext(SHORT_REMINDER);
  }
  injectContext(
    `以下是本项目前端软约束, 写这个文件时请遵守 (来自 .claude/frontend-rules.md):\n\n${stripFrontmatter(content)}`,
  );
}

main();
