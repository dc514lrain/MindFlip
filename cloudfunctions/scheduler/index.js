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
  const userMap: Record<string, number> = {};
  pendingRecords.data.forEach(r => {
    userMap[r._openid] = (userMap[r._openid] || 0) + 1;
  });

  // 过滤已拒绝订阅的用户
  for (const openid of Object.keys(userMap)) {
    const subConfig = await db.collection('subscribe_config')
      .where({ _openid: openid })
      .limit(1)
      .get();
    if (subConfig.data[0]?.is_authorized === false) {
      delete userMap[openid];
    }
  }

  // TODO: 调用 cloud.openapi.subscribeMessage.send 逐用户发送
  // for (const [openid, count] of Object.entries(userMap)) {
  //   await cloud.cloud.callContainer({ ... });
  // }

  // 2. 将超过 48h 的 pending 记录标记为 expired
  const expiredRecords = await db.collection('decision_logs')
    .where({
      follow_status: 'pending',
      created_at: db.command.lt(in48h),
    })
    .get();

  const batch = db.collection('decision_logs');
  for (const record of expiredRecords.data) {
    await batch.doc(record._id).update({
      data: { follow_status: 'expired', expired_at: now },
    });
  }

  // 3. 每周五 17:00 额外执行人格标签计算
  const d = new Date();
  if (d.getDay() === 5 && d.getHours() >= 17) {
    // 获取所有有标记记录的用户
    const markedUsers = await db.collection('decision_logs')
      .aggregate([{ $group: { _id: '$_openid' } }])
      .end();

    for (const { _id: openid } of markedUsers.data) {
      try {
        await cloud.callFunction({ name: 'personality', data: { action: 'recalculate', period: 'weekly' } });
      } catch {
        // 静默忽略单用户失败
      }
    }
  }

  return {
    code: 0,
    message: 'success',
    data: {
      notified_users: Object.keys(userMap).length,
      expired_count: expiredRecords.data.length,
      timestamp: now,
    },
    server_time: now,
  };
};
