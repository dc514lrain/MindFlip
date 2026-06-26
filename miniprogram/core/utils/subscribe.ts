// 决策大师 (MindFlip) — 订阅消息授权流程封装
// 职责: 封装微信订阅消息授权逻辑，处理三振出局智能路由

import { dataService } from '../services/DataService';

interface SubscribeGuideConfig {
  templateId: string;      // 微信订阅消息模板 ID
  scene: string;           // 场景标识：'inbox' | 'vip' | 'first_use'
  title?: string;          // 自定义弹窗标题
  description?: string;    // 自定义描述文案
}

const SCENE_TITLES: Record<string, string> = {
  inbox: '复盘提醒',
  vip: 'VIP 权益通知',
  first_use: '新用户引导',
};

const SCENE_DESCRIPTIONS: Record<string, string> = {
  inbox: '开启后，每天 9:00 将收到待决清单推送提醒，不错过任何一个决定',
  vip: '开启后，重要 VIP 功能更新将及时通知您',
  first_use: '开启订阅消息，获取每日决策复盘提醒服务',
};

/**
 * 引导用户授权订阅消息
 */
export async function requestSubscribeAuth(config: SubscribeGuideConfig): Promise<boolean> {
  return new Promise((resolve) => {
    wx.requestSubscribeMessage({
      tmplIds: [config.templateId],
      success: async (res) => {
        const isAuthorized = res[config.templateId] === 'accept';
        try {
          await dataService.updateSubscribeAuth(isAuthorized);
        } catch {
          // 静默失败
        }
        resolve(isAuthorized);
      },
      fail: async () => {
        // 用户拒绝或系统错误
        try {
          await dataService.updateSubscribeAuth(false);
        } catch {
          // 静默失败
        }
        resolve(false);
      },
    });
  });
}

/**
 * 判断是否应该展示订阅授权引导
 * 三振出局：连续拒绝 3 次后不再主动弹
 */
export function shouldShowSubscribeGuide(
  rejectedCount: number,
  bannerDismissed: boolean,
): boolean {
  if (bannerDismissed) return false;
  if (rejectedCount >= 3) return false; // 三振出局，不主动弹
  return true;
}

/**
 * 获取订阅引导弹窗配置
 */
export function getSubscribeGuideConfig(scene: string): SubscribeGuideConfig {
  return {
    templateId: 'YOUR_TEMPLATE_ID', // TODO: 替换为实际微信订阅消息模板 ID
    scene,
    title: SCENE_TITLES[scene] ?? '消息订阅',
    description: SCENE_DESCRIPTIONS[scene] ?? '',
  };
}

/**
 * 将拒绝次数转换为文案
 */
export function rejectedCountToMessage(count: number): string {
  switch (count) {
    case 0: return '';
    case 1: return '您已拒绝 1 次';
    case 2: return '您已连续拒绝 2 次，再拒绝将不再提示';
    default: return '';
  }
}
