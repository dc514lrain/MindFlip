// 待决清单云函数

// 职责: 查询待决列表、标记决策、获取未读计数

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const VALID_BREAK_REASONS = ['intuition', 'external_change', 'just_testing', 'dislike_result', 'still_thinking'];

exports.main = async (event, context) => {

 const { OPENID } = cloud.getWXContext();

 if (!OPENID) return { code: 401, message: '未登录', data: null, server_time: Date.now() };

 const db = cloud.database();

 const { action } = event;

 if (action === 'list') {

  // 查询待决列表（近 48h）

  const { page_size = 20, page_token } = event;

  const now = Date.now();

  const cutoff = now - 48 * 3600 * 1000;

  let query = db.collection('decision_logs')

   .where({ _openid: OPENID, follow_status: 'pending', created_at: db.command.gte(cutoff) })

   .orderBy('created_at', 'desc')

   .limit(Math.min(page_size, 50));

  const res = await query.get();

  return {

   code: 0,

   message: 'success',

   data: {

​    items: res.data,

​    next_token: null,

​    total: res.data.length,

   },

   server_time: Date.now(),

  };

 }

 if (action === 'mark') {

  // 标记决策

  const { decision_id, follow_status, break_reason } = event;

  if (!decision_id || !follow_status) {

   return { code: 422, message: '缺少必要参数', data: null, server_time: Date.now() };

  }

  if (follow_status === 'not_followed') {

   if (!break_reason || !VALID_BREAK_REASONS.includes(break_reason)) {

​    return { code: 422, message: 'break_reason 必须是系统预设枚举值', data: null, server_time: Date.now() };

   }

  }

  // 查询记录状态

  const record = await db.collection('decision_logs').doc(decision_id).get();

  if (!record.data || record.data._openid !== OPENID) {

   return { code: 404, message: '记录不存在', data: null, server_time: Date.now() };

  }

  if (record.data.follow_status !== 'pending') {

   return { code: 409, message: '该记录已标记，不可重复标记', data: null, server_time: Date.now() };

  }

  const updateData = {

   follow_status,

   break_reason: follow_status === 'not_followed' ? break_reason : null,

   marked_at: Date.now(),

  };

  await db.collection('decision_logs').doc(decision_id).update({ data: updateData });

  // 检查是否触发人格标签解锁（第 10 次标记）

  const countRes = await db.collection('decision_logs')

   .where({ _openid: OPENID, marked_at: db.command.exists(true) })

   .count();

  return {

   code: 0,

   message: 'success',

   data: {

​    marked_at: Date.now(),

​    personality_unlocked: countRes.total >= 10,

   },

   server_time: Date.now(),

  };

 }

 if (action === 'unread') {

  // 获取未读计数

  const now = Date.now();

  const cutoff = now - 48 * 3600 * 1000;

  const res = await db.collection('decision_logs')

   .where({ _openid: OPENID, follow_status: 'pending', created_at: db.command.gte(cutoff) })

   .count();

  return { code: 0, message: 'success', data: { count: res.total }, server_time: Date.now() };

 }

 return { code: 400, message: '未知的 action', data: null, server_time: Date.now() };

};