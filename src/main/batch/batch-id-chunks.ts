/**
 * 一条 SQL 里最多放多少个编号参数. SQLite 对单条语句的参数个数有上限, 整批操作的编号要分块
 * 处理, 取值远低于上限, 也让每条语句保持较小.
 */
export const SQL_PARAMETER_CHUNK_SIZE = 500;

/**
 * 把编号列表按块大小切成若干块, 保持原有顺序.
 * @param ids 编号列表.
 * @param chunkSize 每块最多多少个编号, 默认是 `SQL_PARAMETER_CHUNK_SIZE`.
 * @returns 编号块列表, 编号列表为空时为空数组.
 */
export function chunkIds(
  ids: readonly string[],
  chunkSize: number = SQL_PARAMETER_CHUNK_SIZE,
): readonly (readonly string[])[] {
  const chunks: (readonly string[])[] = [];
  for (let start = 0; start < ids.length; start += chunkSize) {
    chunks.push(ids.slice(start, start + chunkSize));
  }
  return chunks;
}
