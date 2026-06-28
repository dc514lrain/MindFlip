// 定时任务云函数
// 触发方式: 每天 9:00 定时触发 (config.json 中配置 cron: "0 0 9 * * * *")
// 职责: 24h 决策复盘提醒 + 48h 自动过期 + 每周五人格周刊推送

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const now = Date.now();
  const db = cloud.database();
  const _ = db.command;

  // ═══ 1. 24h 决策复盘推送 ═══════════════════════════════════════════════
  const in24h = now - 24 * 3600 * 1000;
  const in48h = now - 48 * 3600 * 1000;

  const pendingRecords = await db.collection('decision_logs')
    .where({
      follow_status: 'pending',
      created_at: _.and(_.lte(in24h), _.gt(in48h)),
    })
    .get();

  // 按用户聚合
  const userMap = {};
  pendingRecords.data.forEach(r => {
    userMap[r._openid] = (userMap[r._openid] || 0) + 1;
  });

  // 过滤未授权 / 被永久拒绝的用户
  const validUsers = [];
  for (const [openid, count] of Object.entries(userMap)) {
    const subConfig = await db.collection('subscribe_config')
      .where({ _openid: openid })
      .limit(1)
      .get();
    const cfg = subConfig.data[0];
    if (!cfg || cfg.is_authorized === false) continue;
    validUsers.push({ openid, count });
  }

  // 发送复盘提醒推送 (模板 1: 待办事项提醒)
  let notifiedCount = 0;
  for (const { openid, count } of validUsers) {
    try {
      await cloud.callFunction({
        name: 'subscribe',
        data: {
          action: 'send_push',
          touser: openid,
          count: count,
          template_type: 'inbox',
        },
      });
      notifiedCount++;
    } catch {
      // 单用户失败不影响整体
    }
  }

  // ═══ 2. 48h 过期自动标记 ═══════════════════════════════════════════════
  const expiredRecords = await db.collection('decision_logs')
    .where({
      follow_status: 'pending',
      created_at: _.lt(in48h),
    })
    .get();

  let expiredCount = 0;
  for (const record of expiredRecords.data) {
    try {
      await db.collection('decision_logs').doc(record._id).update({
        data: { follow_status: 'expired', expired_at: now },
      });
      expiredCount++;
    } catch {
      // 单条失败不影响
    }
  }

  // ═══ 3. 每周五 人格周刊推送 ═══════════════════════════════════════════
  // 定时器每天 9:00 触发。若当天是周五，额外执行人格计算 + 周刊推送
  const d = new Date();
  let weeklyNotified = 0;

  if (d.getDay() === 5) {
    // 3a. 获取有标记记录的用户 → 重新计算人格标签
    const { list: userList } = await db.collection('decision_logs')
      .aggregate()
      .match({
        follow_status: _.in(['followed', 'not_followed']),
      })
      .group({ _id: '$_openid' })
      .end();

    for (const { _id: openid } of userList) {
      try {
        // 触发人格标签计算 (period=weekly)
        const result = await cloud.callFunction({
          name: 'personality',
          data: { action: 'recalculate', period: 'weekly' },
        });

        // 3b. 仅向已授权用户推送周刊 (模板 2: 测评报告生成通知)
        const subConfig = await db.collection('subscribe_config')
          .where({ _openid: openid, is_authorized: true })
          .limit(1)
          .get();

        if (subConfig.data.length > 0 && result.result && result.result.data) {
          const primaryTag = result.result.data.tags?.primary?.name || '理性决策者';
          await cloud.callFunction({
            name: 'subscribe',
            data: {
              action: 'send_push',
              touser: openid,
              template_type: 'weekly',
              tag_name: primaryTag,
            },
          });
          weeklyNotified++;
        }
      } catch {
        // 单用户失败静默忽略
      }
    }
  }

  return {
    code: 0,
    message: 'success',
    data: {
      notified_inbox_users: notifiedCount,
      expired_count: expiredCount,
      notified_weekly_users: weeklyNotified,
      is_friday: d.getDay() === 5,
      timestamp: now,
    },
    server_time: now,
  };
};
