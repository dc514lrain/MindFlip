// 统计云函数
// 职责: 全局统计概览、单工具统计

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();

  if (!OPENID) return { code: 401, message: '未登录', data: null, server_time: Date.now() };

  const db = cloud.database();
  const { scope, tool_id } = event;

  if (scope === 'global') {
    const allRecords = await db.collection('decision_logs').where({ _openid: OPENID }).get();
    const records = allRecords.data;
    const total = records.length;

    const followed = records.filter(r => r.follow_status === 'followed').length;
    const notFollowed = records.filter(r => r.follow_status === 'not_followed').length;
    const pending = records.filter(r => r.follow_status === 'pending').length;
    const expired = records.filter(r => r.follow_status === 'expired').length;

    const followRate = total > 0 ? Math.round((followed / (followed + notFollowed || 1)) * 100) : 0;

    const toolDist = {};
    records.forEach(r => { toolDist[r.tool_type] = (toolDist[r.tool_type] || 0) + 1; });

    const breakReasonDist = {};
    records.filter(r => r.break_reason).forEach(r => {
      breakReasonDist[r.break_reason] = (breakReasonDist[r.break_reason] || 0) + 1;
    });

    return {
      code: 0,
      message: 'success',
      data: {
        total_decisions: total,
        total_follow_rate: followRate,
        tool_distribution: Object.entries(toolDist).map(([tool, count]) => ({ tool, count })),
        follow_breakdown: { followed, not_followed: notFollowed, pending, expired },
        break_reason_distribution: breakReasonDist,
        recent_timeline: records.slice(0, 20),
      },
      server_time: Date.now(),
    };
  }

  if (scope === 'tool') {
    if (!tool_id) return { code: 422, message: '缺少 tool_id', data: null, server_time: Date.now() };

    const records = await db.collection('decision_logs')
      .where({ _openid: OPENID, tool_type: tool_id })
      .orderBy('created_at', 'desc')
      .get();

    const total = records.data.length;
    const followed = records.data.filter(r => r.follow_status === 'followed').length;
    const notFollowed = records.data.filter(r => r.follow_status === 'not_followed').length;
    const followRate = (followed + notFollowed) > 0 ? Math.round((followed / (followed + notFollowed)) * 100) : 0;

    // 时间热力图 7×24（周一=0）
    const heatmap = Array.from({ length: 7 }, () => new Array(24).fill(0));
    records.data.forEach(r => {
      const d = new Date(r.created_at);
      const day = (d.getDay() + 6) % 7;
      const hour = d.getHours();
      heatmap[day][hour]++;
    });

    const dist = {};
    records.data.forEach(r => { dist[r.raw_result] = (dist[r.raw_result] || 0) + 1; });

    return {
      code: 0,
      message: 'success',
      data: {
        tool_id,
        tool_name: tool_id,
        total_uses: total,
        time_heatmap: heatmap,
        result_distribution: dist,
        follow_rate: followRate,
        break_reason_distribution: {},
        history: records.data.slice(0, 50),
      },
      server_time: Date.now(),
    };
  }

  return { code: 400, message: '未知的 scope', data: null, server_time: Date.now() };
};
