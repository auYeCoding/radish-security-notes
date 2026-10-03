import { describe, expect, it } from "vitest";

import { sortByName } from "./sort-by-name";

/**
 * 把名称列表包成带名称的对象, 排序后再取回名称.
 * @param names 名称列表.
 * @returns 排序后的名称列表.
 */
function sortedNames(names: readonly string[]): string[] {
  return sortByName(names.map((name) => ({ name }))).map((item) => item.name);
}

describe("sortByName 的类别与长度", () => {
  it.each([
    [
      "1 三类先后",
      ["邮箱", "Gmail邮箱", "Gmail"],
      ["Gmail", "Gmail邮箱", "邮箱"],
    ],
    ["2 类别先于长度", ["邮", "Gmail"], ["Gmail", "邮"]],
    ["3 英文长度", ["GitHub", "Gmail", "Git"], ["Git", "Gmail", "GitHub"]],
    ["4 中文长度", ["邮箱账号", "邮箱", "邮"], ["邮", "邮箱", "邮箱账号"]],
    ["5 表情算一个字符", ["bc", "a😀"], ["a😀", "bc"]],
  ])("%s", (_label, input, expected) => {
    expect(sortedNames(input)).toEqual(expected);
  });
});

describe("sortByName 的首字母", () => {
  it.each([
    ["6 忽略大小写", ["Cat", "bat", "Ant"], ["Ant", "bat", "Cat"]],
    ["8 重音", ["Fc", "Éa", "Db"], ["Db", "Éa", "Fc"]],
    ["9 全角", ["Ｂx", "Ay"], ["Ay", "Ｂx"]],
    [
      "10 中文首拼",
      ["淘宝", "邮箱", "微信", "阿里"],
      ["阿里", "淘宝", "微信", "邮箱"],
    ],
    ["11 混杂取第一个字符", ["微信Pay", "Pay微信"], ["Pay微信", "微信Pay"]],
  ])("%s", (_label, input, expected) => {
    expect(sortedNames(input)).toEqual(expected);
  });

  it.each([
    ["7 大小写相同保持输入顺序", ["apple", "Apple"]],
    ["7 大小写相同保持输入顺序 (反过来)", ["Apple", "apple"]],
    ["25 完全同键保持输入顺序", ["Apple", "Alpha"]],
    ["25 完全同键保持输入顺序 (反过来)", ["Alpha", "Apple"]],
    ["24 无拼音汉字组内保持输入顺序", ["𠀀", "兙"]],
    ["24 无拼音汉字组内保持输入顺序 (反过来)", ["兙", "𠀀"]],
  ])("%s", (_label, input) => {
    expect(sortedNames(input)).toEqual(input);
  });
});

describe("sortByName 的多音字", () => {
  it("27 多音字取固定读音, 重庆与长沙都按 z 排在成都之后", () => {
    expect(sortedNames(["重庆", "长沙", "成都"])).toEqual([
      "成都",
      "重庆",
      "长沙",
    ]);
  });
});

describe("sortByName 的数字开头", () => {
  it.each([
    ["12 数字按整数值", ["12ab", "9abc"], ["9abc", "12ab"]],
    ["13 数字在字母前", ["b123", "1234", "a123"], ["1234", "a123", "b123"]],
    [
      "15 超长数字不溢出",
      ["100000000000000000000", "99999999999999999999a"],
      ["99999999999999999999a", "100000000000000000000"],
    ],
    ["21 数字开头的混杂", ["机", "1号机"], ["1号机", "机"]],
  ])("%s", (_label, input, expected) => {
    expect(sortedNames(input)).toEqual(expected);
  });

  it.each([
    ["14 数字值相同保持输入顺序", ["01a", "1ab"]],
    ["14 数字值相同保持输入顺序 (反过来)", ["1ab", "01a"]],
  ])("%s", (_label, input) => {
    expect(sortedNames(input)).toEqual(input);
  });
});

describe("sortByName 的符号与分类", () => {
  it.each([
    [
      "16 符号在数字前",
      ["abcde", "1abcd", "_tmp1"],
      ["_tmp1", "1abcd", "abcde"],
    ],
    ["17 符号按码点", ["~ab", "!ab", "#ab"], ["!ab", "#ab", "~ab"]],
    ["18 其它文字归符号组", ["ab", "あい"], ["あい", "ab"]],
    ["19 纯数字与纯符号归纯英文", ["邮", "123", "!!!"], ["!!!", "123", "邮"]],
    [
      "20 汉字加符号为纯中文, 加数字为混杂",
      ["备份(旧)", "备份1"],
      ["备份1", "备份(旧)"],
    ],
    ["22 汉字加假名为混杂", ["邮邮", "あ邮"], ["あ邮", "邮邮"]],
    ["23 无拼音汉字在 Z 之后", ["兙", "邮", "阿"], ["阿", "邮", "兙"]],
  ])("%s", (_label, input, expected) => {
    expect(sortedNames(input)).toEqual(expected);
  });
});

describe("sortByName 的稳定性与纯度", () => {
  it("26 不修改入参, 返回新数组", () => {
    const input = [{ name: "b" }, { name: "a" }];

    const result = sortByName(input);

    expect(input.map((item) => item.name)).toEqual(["b", "a"]);
    expect(result).not.toBe(input);
    expect(result.map((item) => item.name)).toEqual(["a", "b"]);
  });

  it("保留对象的其它字段与引用", () => {
    const first = { name: "b", id: 1 };
    const second = { name: "a", id: 2 };

    const result = sortByName([first, second]);

    expect(result[0]).toBe(second);
    expect(result[1]).toBe(first);
  });

  it("很多同键对象仍保持输入顺序", () => {
    const input = Array.from({ length: 200 }, (_value, index) => ({
      name: "Tag",
      id: index,
    }));

    const result = sortByName(input);

    expect(result.map((item) => item.id)).toEqual(input.map((item) => item.id));
  });

  it("空列表得到空列表", () => {
    expect(sortByName([])).toEqual([]);
  });
});
