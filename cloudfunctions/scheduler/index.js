// 定时任务云函数
// 触发方式: 每天 9:00 定时触发（需在 CloudBase 控制台配置定时触发器）
// 职责: 24h 提醒推送 + 48h 自动过期 + 每周五人格标签计算

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const now = Date.now();
  const db = cloud.database();

  // 1. 查询 24h <= age < 48h 的待决记录
  const in24h = now - 24 * 3600 * 1000;
  const in48h = now - 48 * 3600 * 1000;

  const pendingRecords = await db.collection('decision_logs')
    .where({
      follow_status: 'pending',
      created_at: db.command.and(
        db.command.lte(in24h),
        db.command.gt(in48h),
      ),
    })
    .get();

  // 按用户聚合
  const userMap = {};
  pendingRecords.data.forEach(r => {
    userMap[r._openid] = (userMap[r._openid] || 0) + 1;
  });

  // 过滤已拒绝订阅的用户
  const validUsers = [];
  for (const [openid, count] of Object.entries(userMap)) {
    const subConfig = await db.collection('subscribe_config')
      .where({ _openid: openid })
      .limit(1)
      .get();
    const cfg = subConfig.data[0];
    // 跳过未授权或永久拒绝的用户
    if (cfg && cfg.is_authorized === false) continue;
    validUsers.push({ openid, count });
  }

  // 发送订阅消息
  let notifiedCount = 0;
  for (const { openid, count } of validUsers) {
    try {
      await cloud.callFunction({
        name: 'subscribe',
        data: { action: 'send_push', touser: openid, count },
      });
      notifiedCount++;
    } catch {
      // 单用户失败不影响整体
    }
  }

  // 2. 将超过 48h 的 pending 记录标记为 expired
  const expiredRecords = await db.collection('decision_logs')
    .where({
      follow_status: 'pending',
      created_at: db.command.lt(in48h),
    })
    .get();

  for (const record of expiredRecords.data) {
    try {
      await db.collection('decision_logs').doc(record._id).update({
        data: { follow_status: 'expired', expired_at: now },
      });
    } catch {
      // 单条失败不影响
    }
  }

  // 3. 每周五 17:00 额外执行人格标签计算
  const d = new Date();
  if (d.getDay() === 5 && d.getHours() >= 17) {
    // 获取所有有标记记录的用户
    const markedUsers = await db.collection('decision_logs')
      .aggregate()
      .group({ _id: '$_openid' })
      .end();

    for (const { _id: openid } of markedUsers.data) {
      try {
        await cloud.callFunction({
          name: 'personality',
          data: { action: 'recalculate', period: 'weekly' },
        });
      } catch {
        // 单用户失败静默忽略
      }
    }
  }

  return {
    code: 0,
    message: 'success',
    data: {
      notified_users: notifiedCount,
      expired_count: expiredRecords.data.length,
      timestamp: now,
    },
    server_time: now,
  };
};
