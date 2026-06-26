// 决策记录云函数
// 职责: 决策记录 CRUD，离线批量同步

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return { code: 401, message: '未登录', data: null, server_time: Date.now() };

  const db = cloud.database();
  const { action } = event;

  if (action === 'create') {
    // 保存决策记录
    const { tool_type, raw_result, semantic_result, user_memo } = event;
    if (!tool_type || !raw_result || !semantic_result) {
      return { code: 422, message: '参数校验失败', data: null, server_time: Date.now() };
    }
    if (semantic_result.length > 200) {
      return { code: 422, message: 'semantic_result 最多 200 字符', data: null, server_time: Date.now() };
    }

    const record = {
      _openid: OPENID,
      tool_type,
      tool_id: tool_type,
      tool_name: tool_type,
      raw_result,
      semantic_result,
      user_memo: user_memo || '',
      follow_status: 'pending',
      break_reason: null,
      created_at: Date.now(),
      marked_at: null,
      expired_at: null,
    };

    const result = await db.collection('decision_logs').add({ data: record });
    return {
      code: 0,
      message: 'success',
      data: { decision_id: result._id, created_at: record.created_at },
      server_time: Date.now(),
    };
  }

  if (action === 'sync') {
    // 批量同步离线记录（去重）
    const { decisions } = event;
    if (!Array.isArray(decisions) || decisions.length > 20) {
      return { code: 422, message: '单次最多同步 20 条', data: null, server_time: Date.now() };
    }

    let synced = 0;
    for (const item of decisions) {
      if (!item._id) continue;
      try {
        await db.collection('decision_logs').doc(item._id).set({ data: item });
        synced++;
      } catch {
        // 静默忽略单条失败
      }
    }
    return { code: 0, message: `已同步 ${synced} 条`, data: { synced }, server_time: Date.now() };
  }

  return { code: 400, message: '未知的 action', data: null, server_time: Date.now() };
};
