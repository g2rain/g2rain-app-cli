/**
 * ID 生成器工具类
 * 用于生成唯一的随机 ID
 */

export class Generator {
  private static counter = 0;
  private static lastTimestamp = 0;

  /**
   * 生成随机 ID
   * @returns 随机 ID 字符串
   */
  static random(): string {
    const now = Date.now();
    const randomArray = new Uint32Array(4);
    crypto.getRandomValues(randomArray);

    // 如果同一毫秒内生成多个ID，增加计数器
    if (now === this.lastTimestamp) {
      this.counter++;
    } else {
      this.counter = 0;
      this.lastTimestamp = now;
    }

    const parts = [
      now.toString(16).padStart(12, '0'),
      this.counter.toString(16).padStart(4, '0'),
      randomArray[0].toString(16).padStart(8, '0'),
      randomArray[1].toString(16).padStart(8, '0'),
      randomArray[2].toString(16).padStart(8, '0'),
      randomArray[3].toString(16).padStart(8, '0'),
    ];

    return parts.join('');
  }
}

