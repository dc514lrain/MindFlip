// 决策大师 (MindFlip) — 时间格式化工具
// 职责: 时间格式化、48h 过期计算、相对时间展示

const MS_PER_HOUR = 3600 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/**
 * 格式化时间戳为可读字符串
 * @param timestamp ms 时间戳
 * @param format 'date' | 'time' | 'datetime' | 'full'
 */
export function formatTime(timestamp: number, format: 'date' | 'time' | 'datetime' | 'full' = 'datetime'): string {
  const d = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, '0');

  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

  switch (format) {
    case 'date': return date;
    case 'time': return time;
    case 'datetime': return `${date} ${time}`;
    case 'full': return `${date} ${time}`;
    default: return `${date} ${time}`;
  }
}

/**
 * 计算相对时间字符串（如 "3 小时前"、"2 天前"）
 */
export function relativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < MS_PER_HOUR) {
    const mins = Math.floor(diff / (60 * 1000));
    return mins <= 0 ? '刚刚' : `${mins} 分钟前`;
  }
  if (diff < MS_PER_DAY) {
    const hours = Math.floor(diff / MS_PER_HOUR);
    return `${hours} 小时前`;
  }
  const days = Math.floor(diff / MS_PER_DAY);
  if (days === 1) return '昨天';
  if (days < 7) return `${days} 天前`;
  if (days < 30) return `${Math.floor(days / 7)} 周前`;
  return formatTime(timestamp, 'date');
}

/**
 * 判断决策是否已超过 48 小时（需自动过期）
 */
export function isExpired(createdAt: number): boolean {
  return (Date.now() - createdAt) >= 48 * MS_PER_HOUR;
}

/**
 * 判断决策是否接近过期（小于 6 小时）
 */
export function isExpiringSoon(createdAt: number): boolean {
  const diff = Date.now() - createdAt;
  return diff >= 42 * MS_PER_HOUR && diff < 48 * MS_PER_HOUR;
}

/**
 * 获取到期倒计时字符串
 */
export function expireCountdown(createdAt: number): string {
  const diff = 48 * MS_PER_HOUR - (Date.now() - createdAt);
  if (diff <= 0) return '已过期';
  const hours = Math.floor(diff / MS_PER_HOUR);
  const mins = Math.floor((diff % MS_PER_HOUR) / (60 * 1000));
  if (hours > 0) return `${hours}小时${mins}分钟后过期`;
  return `${mins} 分钟后过期`;
}

/**
 * 获取星期几（0=周一 ... 6=周日）
 */
export function getDayOfWeek(timestamp: number): number {
  return new Date(timestamp).getDay();
}

/**
 * 获取小时（0-23）
 */
export function getHourOfDay(timestamp: number): number {
  return new Date(timestamp).getHours();
}
