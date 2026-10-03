/**
 * 拼音排序的比较器, 取自运行环境内置的国际化排序 (Intl.Collator 的拼音排序规则). 模块求值时创建一次.
 */
const PINYIN_COLLATOR = new Intl.Collator("zh-u-co-pinyin");

/**
 * 拼音首字母的分界点: 这个汉字是该首字母在拼音排序里的第一个汉字, 它与下一个分界汉字之间 (含它,
 * 不含下一个) 的汉字拼音首字母都是它的首字母. 拼音里没有 i, u, v 开头的音节.
 */
interface PinyinBoundary {
  /**
   * 小写的拼音首字母.
   */
  readonly initial: string;
  /**
   * 该首字母在拼音排序里排在最前的汉字.
   */
  readonly character: string;
}

/**
 * 按拼音先后排列的 23 个首字母分界点, 取自运行环境拼音排序的实际顺序 (例如 他 排在 它 之前, 所以
 * t 的分界点是 他, 而不是常见的 GB 2312 分界字 它).
 */
const PINYIN_BOUNDARIES: readonly PinyinBoundary[] = [
  { initial: "a", character: "吖" },
  { initial: "b", character: "丷" },
  { initial: "c", character: "嚓" },
  { initial: "d", character: "咑" },
  { initial: "e", character: "妸" },
  { initial: "f", character: "发" },
  { initial: "g", character: "旮" },
  { initial: "h", character: "哈" },
  { initial: "j", character: "丌" },
  { initial: "k", character: "咔" },
  { initial: "l", character: "垃" },
  { initial: "m", character: "呣" },
  { initial: "n", character: "拏" },
  { initial: "o", character: "喔" },
  { initial: "p", character: "妑" },
  { initial: "q", character: "七" },
  { initial: "r", character: "呥" },
  { initial: "s", character: "仨" },
  { initial: "t", character: "他" },
  { initial: "w", character: "屲" },
  { initial: "x", character: "夕" },
  { initial: "y", character: "丫" },
  { initial: "z", character: "帀" },
];

/**
 * 基本区里没有拼音读音的汉字中排在最前的一个: 拼音排序把基本区里有读音的汉字都排在它之前.
 */
const NO_PINYIN_SENTINEL = "兙";

/**
 * 匹配取拼音的范围: 基本区汉字 (U+4E00 至 U+9FFF) 与 〇. 范围之外的汉字 (扩展区, 汉字记号 々 等) 一律
 * 当作没有读音: 运行环境的拼音排序把它们里没有读音的部分排在哪里不一致 (Node 与 Electron 不同),
 * 而扩展区里有读音的汉字只有约 270 个, 几乎不会出现在名称里.
 */
const PINYIN_COVERED_CHARACTER = /^[〇一-鿿]$/u;

/**
 * 判断汉字是否有拼音读音.
 * @param hanCharacter 单个汉字.
 * @returns 有读音时返回 true.
 */
function hasPinyin(hanCharacter: string): boolean {
  return (
    PINYIN_COVERED_CHARACTER.test(hanCharacter) &&
    PINYIN_COLLATOR.compare(hanCharacter, PINYIN_BOUNDARIES[0].character) >=
      0 &&
    PINYIN_COLLATOR.compare(hanCharacter, NO_PINYIN_SENTINEL) < 0
  );
}

/**
 * 判断汉字在拼音排序里是否不早于某个分界点.
 * @param hanCharacter 单个汉字.
 * @param boundary 分界点.
 * @returns 不早于分界点时返回 true.
 */
function isAtOrAfter(hanCharacter: string, boundary: PinyinBoundary): boolean {
  return PINYIN_COLLATOR.compare(hanCharacter, boundary.character) >= 0;
}

/**
 * 在分界点里二分查找不晚于汉字的最后一个分界点的位置.
 * @param hanCharacter 有拼音读音的单个汉字.
 * @returns 分界点在 `PINYIN_BOUNDARIES` 里的位置.
 */
function findBoundaryIndex(hanCharacter: string): number {
  let low = 0;
  let high = PINYIN_BOUNDARIES.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (isAtOrAfter(hanCharacter, PINYIN_BOUNDARIES[middle])) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }
  return low;
}

/**
 * 取汉字的拼音首字母. 多音字只取运行环境排序数据里的一个固定读音, 不看上下文 (例如 重 取 zhong,
 * 重庆也按 z); 没有读音的汉字 (基本区的少数生僻字, 以及基本区之外的汉字) 没有首字母.
 * @param hanCharacter 单个汉字.
 * @returns 小写的拼音首字母, 没有读音时为 undefined.
 */
export function pinyinInitialOf(hanCharacter: string): string | undefined {
  if (!hasPinyin(hanCharacter)) {
    return undefined;
  }
  return PINYIN_BOUNDARIES[findBoundaryIndex(hanCharacter)].initial;
}
