/**
 * Token估算器
 * 用于估算文本的token数量,支持中英文混合文本
 * 
 * 估算规则:
 * - 中文字符: 1字符 ≈ 1 token
 * - 英文字符: 4字符 ≈ 1 token
 * - 其他字符(标点、空格等): 按英文规则处理
 */

/**
 * 估算文本的token数量
 * @param text 待估算的文本
 * @returns 估算的token数量
 */
export function estimateTokens(text: string): number {
  if (!text || text.length === 0) {
    return 0;
  }

  let chineseChars = 0;
  let otherChars = 0;

  // 遍历文本,统计中文字符和其他字符
  for (const char of text) {
    if (isChinese(char)) {
      chineseChars++;
    } else {
      otherChars++;
    }
  }

  // 中文: 1字符 ≈ 1 token
  // 英文及其他: 4字符 ≈ 1 token
  const chineseTokens = chineseChars;
  const otherTokens = Math.ceil(otherChars / 4);

  return chineseTokens + otherTokens;
}

/**
 * 判断字符是否为中文字符
 * @param char 单个字符
 * @returns 是否为中文字符
 */
function isChinese(char: string): boolean {
  const code = char.charCodeAt(0);
  // 中文字符的Unicode范围:
  // 基本汉字: 0x4E00-0x9FFF
  // 扩展A: 0x3400-0x4DBF
  // 扩展B: 0x20000-0x2A6DF
  // 扩展C-F: 0x2A700-0x2CEAF
  // 兼容汉字: 0xF900-0xFAFF
  // 兼容补充: 0x2F800-0x2FA1F
  return (
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0xf900 && code <= 0xfaff)
  );
}
