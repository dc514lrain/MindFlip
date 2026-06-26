// 登录云函数
// 职责: 微信 code2Session 换取 openid/unionid，查询/创建用户记录

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();

  if (!OPENID) {
    return { code: 401, message: '未登录', data: null, server_time: Date.now() };
  }

  const db = cloud.database();
  const { code } = event;

  // TODO: 调用 wx.auth.code2Session 换取 session_key / openid / unionid
  // const session = await cloud.cloud.callContainer({ ... });

  // 查询用户是否已存在
  let user = null;
  let isNewUser = false;

  try {
    const users = await db.collection('users')
      .where({ _openid: OPENID })
      .limit(1)
      .get();

    if (users.data.length > 0) {
      user = users.data[0];
      // 更新最后登录时间
      await db.collection('users').doc(user._id).update({
        data: { last_login_at: Date.now(), updated_at: Date.now() },
      });
    } else {
      // 创建新用户
      isNewUser = true;
      const newUser = {
        _openid: OPENID,
        unionid: '', // TODO: code2Session 后填充
        nickname: '微信用户',
        avatar_url: '',
        vip_level: 'free',
        vip_expire_at: null,
        vip_since: null,
        tool_slot_used: 0,
        tool_slot_max: 1,
        privacy_mode: 'standard',
        stats_snapshot: {
          total_decisions: 0,
          total_follow_rate: 0,
          primary_tag: null,
          weekly_decisions: 0,
          updated_at: Date.now(),
        },
        created_at: Date.now(),
        updated_at: Date.now(),
        last_login_at: Date.now(),
      };
      const result = await db.collection('users').add({ data: newUser });
      user = { ...newUser, _id: result._id };
    }
  } catch (err) {
    return { code: 500, message: '服务器错误', data: null, server_time: Date.now() };
  }

  // 生成 token (Phase 1 简化版)
  const token = `${OPENID}_${Date.now()}`;

  return {
    code: 0,
    message: 'success',
    data: {
      token,
      user: {
        openid: user._openid,
        unionid: user.unionid,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
        vip_level: user.vip_level,
        vip_expire_at: user.vip_expire_at,
        tool_slot_used: user.tool_slot_used,
        tool_slot_max: user.tool_slot_max,
        privacy_mode: user.privacy_mode,
        stats_snapshot: user.stats_snapshot,
      },
      is_new_user: isNewUser,
    },
    server_time: Date.now(),
  };
};
