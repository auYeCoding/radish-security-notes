/**
 * 导入文件允许的最大字节数, 读取之前先用文件状态检查.
 */
export const MAX_IMPORT_FILE_BYTES = 20 * 1024 * 1024;

/**
 * 一次导入最多接受的条目个数, 解析之后检查, 超过时整次拒绝.
 */
export const MAX_IMPORT_ENTRIES = 10000;
