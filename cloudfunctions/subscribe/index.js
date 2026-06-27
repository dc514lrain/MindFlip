// 订阅消息云函数
// 职责: 订阅消息授权状态更新、发送订阅消息推送

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 订阅消息模板 ID（需在微信后台申请）
const TEMPLATE_ID = 'YOUR_TEMPLATE_ID';

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return { code: 401, message: '未登录', data: null, server_time: Date.now() };

  const db = cloud.database();
  const { action, is_authorized } = event;

  if (action === 'update_auth') {
    const now = Date.now();
    const existing = await db.collection('subscribe_config')
      .where({ _openid: OPENID })
      .limit(1)
      .get();

    if (existing.data.length > 0) {
      const doc = existing.data[0];
      const updateData = {};
      updateData.is_authorized = is_authorized;
      updateData.updated_at = now;
      if (is_authorized) {
        updateData.rejected_count = 0;
        updateData.banner_skip_count = 0;
      } else {
        updateData.rejected_count = (doc.rejected_count || 0) + 1;
      }
      await db.collection('subscribe_config').doc(doc._id).update({ data: updateData });
    } else {
      await db.collection('subscribe_config').add({
        data: {
          _openid: OPENID,
          is_authorized: is_authorized || false,
          authorized_at: is_authorized ? now : null,
          rejected_count: is_authorized ? 0 : 1,
          banner_dismissed: false,
          banner_last_shown_at: now,
          banner_skip_count: 0,
          created_at: now,
          updated_at: now,
        },
      });
    }

    return { code: 0, message: 'success', data: null, server_time: now };
  }

  if (action === 'get_auth') {
    const existing = await db.collection('subscribe_config')
      .where({ _openid: OPENID })
      .limit(1)
      .get();

    if (existing.data.length > 0) {
      const doc = existing.data[0];
      return {
        code: 0,
        message: 'success',
        data: {
          is_authorized: doc.is_authorized ?? false,
          rejected_count: doc.rejected_count ?? 0,
          banner_dismissed: doc.banner_dismissed ?? false,
        },
        server_time: Date.now(),
      };
    }
    return {
      code: 0,
      message: 'success',
      data: { is_authorized: false, rejected_count: 0, banner_dismissed: false },
      server_time: Date.now(),
    };
  }

  if (action === 'send_push') {
    // 仅供 scheduler 云函数内部调用
    const { touser, count } = event;
    if (!touser || !count) {
      return { code: 422, message: '缺少必要参数', data: null, server_time: Date.now() };
    }
    try {
      const result = await cloud.openapi.subscribeMessage.send({
        touser: touser,
        templateId: TEMPLATE_ID,
        page: 'pages/review/review',
        data: {
          thing1: { value: `${count} 个决定等待复盘` },
          time2: { value: '过去 24 小时' },
          thing3: { value: '点击完成复盘标记' },
        },
      });
      return { code: 0, message: 'success', data: result, server_time: Date.now() };
    } catch (err) {
      console.error('[subscribe] 发送失败', err);
      return { code: err?.errCode || 500, message: '发送失败', data: null, server_time: Date.now() };
    }
  }

  return { code: 400, message: '未知的 action', data: null, server_time: Date.now() };
};
