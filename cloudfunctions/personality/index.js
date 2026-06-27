// 人格标签云函数
// 职责: 人格标签计算与查询

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// MVP 标签判定逻辑
function computePrimaryTag(stats) {
  if (stats.follow_rate > 90) return { name: '绝对理性派', icon: '🎯' };
  if (stats.follow_rate < 30) return { name: '逆向叛逆者', icon: '🔄' };
  if (stats.top_tool === 'coin' && stats.follow_rate > 70) return { name: '天意顺从者', icon: '🙏' };
  if (stats.dominant_break_reason === 'intuition') return { name: '直觉驱动型', icon: '🧠' };
  if (stats.dominant_break_reason === 'just_testing') return { name: '工具探索型', icon: '🧪' };
  if (stats.dominant_break_reason === 'external_change') return { name: '务实应变型', icon: '🌧️' };
  if (stats.dominant_break_reason === 'still_thinking') return { name: '审慎观望型', icon: '⏳' };
  return { name: '理性决策者', icon: '⚖️' };
}

function computeSecondaryTags(stats) {
  const tags = [];
  if (stats.follow_rate >= 60 && stats.follow_rate <= 80) tags.push({ name: '平衡型', icon: '⚖️' });
  if (stats.tool_diversity >= 3) tags.push({ name: '多元工具型', icon: '🎲' });
  return tags.slice(0, 2);
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return { code: 401, message: '未登录', data: null, server_time: Date.now() };

  const db = cloud.database();
  const { action, period = 'weekly' } = event;

  if (action === 'recalculate') {
    return computeAndSave(OPENID, db, period);
  }

  // 查询人格标签
  const tags = await db.collection('personality_tags')
    .where({ _openid: OPENID, period_type: period })
    .orderBy('period_end', 'desc')
    .limit(1)
    .get();

  const markedCountRes = await db.collection('decision_logs')
    .where({ _openid: OPENID })
    .field({ marked_at: true })
    .and()
    .where({ marked_at: db.command.exists(true) })
    .count();

  const markedCount = markedCountRes.total;
  const required = 10;

  if (tags.data.length > 0) {
    const t = tags.data[0];
    return {
      code: 0, message: 'success',
      data: {
        tags: {
          primary: { name: t.primary_tag, icon: t.primary_tag_icon },
          secondary: (t.secondary_tags || []).map((name, i) => ({ name, icon: (t.secondary_tag_icons || [])[i] || '' })),
        },
        preheat_progress: { current: markedCount, required, next_milestone_msg: '' },
        stats_basis: t.calculation_input,
        calculated_at: t.calculated_at,
      },
      server_time: Date.now(),
    };
  }

  // 未解锁
  const remaining = Math.max(0, required - markedCount);
  return {
    code: 0, message: 'success',
    data: {
      tags: null,
      preheat_progress: {
        current: markedCount,
        required,
        next_milestone_msg: `还差 ${remaining} 次即可生成专属人格档案`,
      },
      stats_basis: { follow_rate: 0, dominant_break_reason: '', top_tool: '' },
      calculated_at: null,
    },
    server_time: Date.now(),
  };
};

async function computeAndSave(openid, db, period) {
  const now = Date.now();
  const weekAgo = period === 'weekly' ? now - 7 * 24 * 3600 * 1000 : 0;

  const query = db.collection('decision_logs')
    .where({
      _openid: openid,
      marked_at: db.command.exists(true),
    });

  // 如果是 weekly，额外过滤 created_at
  const records = await query.get();

  const filteredRecords = period === 'weekly'
    ? records.data.filter(r => r.created_at >= weekAgo)
    : records.data;

  const total = filteredRecords.length;
  if (total === 0) {
    return { code: 0, message: '无数据', data: { tags: null }, server_time: now };
  }

  const followed = filteredRecords.filter(r => r.follow_status === 'followed').length;
  const notFollowed = filteredRecords.filter(r => r.follow_status === 'not_followed').length;
  const followRate = Math.round((followed / (followed + notFollowed || 1)) * 100);

  // top_tool
  const toolCount = {};
  filteredRecords.forEach(r => { toolCount[r.tool_type] = (toolCount[r.tool_type] || 0) + 1; });
  const topTool = Object.entries(toolCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

  // dominant_break_reason
  const reasonCount = {};
  filteredRecords.filter(r => r.break_reason).forEach(r => {
    reasonCount[r.break_reason] = (reasonCount[r.break_reason] || 0) + 1;
  });
  const dominantReason = Object.entries(reasonCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

  const primary = computePrimaryTag({ follow_rate: followRate, top_tool: topTool, dominant_break_reason: dominantReason });
  const secondary = computeSecondaryTags({ follow_rate: followRate, tool_diversity: Object.keys(toolCount).length });

  const tagRecord = {
    _openid: openid,
    period_type: period,
    period_start: weekAgo || 0,
    period_end: now,
    primary_tag: primary.name,
    primary_tag_icon: primary.icon,
    secondary_tags: secondary.map(s => s.name),
    secondary_tag_icons: secondary.map(s => s.icon),
    calculation_input: {
      total_decisions: total,
      followed_count: followed,
      not_followed_count: notFollowed,
      follow_rate: followRate,
      break_reason_distribution: reasonCount,
      tool_diversity: Object.keys(toolCount).length,
    },
    calculated_at: now,
    algorithm_version: '1.0',
  };

  await db.collection('personality_tags').add({ data: tagRecord });

  return {
    code: 0, message: 'success',
    data: { tags: { primary, secondary } },
    server_time: now,
  };
}
