// 订阅消息云函数
// 职责: 订阅消息授权状态更新

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

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
      const updateData: Record<string, unknown> = {
        is_authorized,
        updated_at: now,
      };
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

  return { code: 400, message: '未知的 action', data: null, server_time: Date.now() };
};
