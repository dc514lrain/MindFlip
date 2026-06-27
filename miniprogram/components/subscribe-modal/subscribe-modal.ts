// 订阅消息授权半屏弹窗组件
// 职责: 首次使用工具后的订阅消息授权弹窗

import { dataService } from '../../core/services/DataService';

Component({
  properties: {
    visible: { type: Boolean, value: false },
    toolName: { type: String, value: '硬币' },
  },

  data: {
    benefits: [
      '每天 9:00 推送待决清单',
      '帮助养成复盘习惯',
      '随时可在微信内关闭',
    ],
  },

  methods: {
    async onAuthorize(): Promise<void> {
      try {
        const res = await new Promise<WechatMiniprogram.RequestSubscribeMessageSuccessCallbackResult>((resolve, reject) => {
          wx.requestSubscribeMessage({
            tmplIds: ['YOUR_TEMPLATE_ID'],
            success: resolve,
            fail: reject,
          });
        });
        const accepted = res['YOUR_TEMPLATE_ID'] === 'accept';
        await dataService.updateSubscribeAuth(accepted);
        this.triggerEvent('result', { accepted, from: 'modal' });
        this.close();
      } catch {
        await dataService.updateSubscribeAuth(false);
        this.triggerEvent('result', { accepted: false, from: 'modal' });
        this.close();
      }
    },

    onLater(): void {
      this.triggerEvent('result', { accepted: false, from: 'later' });
      this.close();
    },

    onClose(): void {
      this.close();
    },

    close(): void {
      this.triggerEvent('close');
    },

    noop(): void {
      // 阻止事件冒泡
    },
  },
});
