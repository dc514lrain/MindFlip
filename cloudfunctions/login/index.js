// 登录云函数
// 职责: 微信登录、用户信息创建/更新、token 生成

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { OPENID } = wxContext;

  if (!OPENID) {
    return { code: 401, message: '未登录', data: null, server_time: Date.now() };
  }

  const db = cloud.database();
  const {
    code,
    action,
    nickname,
    avatar_url,
  } = event;

  // action='get_profile': 仅返回当前用户信息（用于 token 续期）
  if (action === 'get_profile') {
    try {
      const users = await db.collection('users').where({ _openid: OPENID }).limit(1).get();
      if (users.data.length === 0) {
        return { code: 404, message: '用户不存在', data: null, server_time: Date.now() };
      }
      const user = users.data[0];
      return {
        code: 0, message: 'success',
        data: {
          openid: user._openid,
          unionid: user.unionid || '',
          nickname: user.nickname || '微信用户',
          avatar_url: user.avatar_url || '',
          vip_level: user.vip_level || 'free',
          vip_expire_at: user.vip_expire_at || null,
          tool_slot_used: user.tool_slot_used || 0,
          tool_slot_max: user.tool_slot_max || 1,
          privacy_mode: user.privacy_mode || 'standard',
          stats_snapshot: user.stats_snapshot || {
            total_decisions: 0,
            total_follow_rate: 0,
            primary_tag: null,
            weekly_decisions: 0,
            updated_at: Date.now(),
          },
        },
        server_time: Date.now(),
      };
    } catch {
      return { code: 500, message: '服务器错误', data: null, server_time: Date.now() };
    }
  }

  // 校验 code（可选，若传入则验证有效性）
  if (code) {
    try {
      await cloud.openapi.auth.code2Session({ code });
    } catch {
      // code 无效不影响登录，降级使用 OPENID 直接登录
    }
  }

  // 查询用户是否已存在
  let user = null;
  let isNewUser = false;

  try {
    const users = await db.collection('users')
      .where({ _openid: OPENID })
      .limit(1)
      .get();

    const now = Date.now();

    if (users.data.length > 0) {
      // 老用户：更新登录时间，若传入新昵称/头像也一并更新
      user = users.data[0];
      const updateData = {
        last_login_at: now,
        updated_at: now,
      };
      // 首次登录时 nickname 为空，之后传入则更新
      if (nickname && user.nickname === '微信用户') {
        updateData.nickname = nickname;
      }
      if (avatar_url && !user.avatar_url) {
        updateData.avatar_url = avatar_url;
      }
      await db.collection('users').doc(user._id).update({ data: updateData });
      // 合并最新数据
      Object.assign(user, updateData);
    } else {
      // 新用户：创建记录
      isNewUser = true;
      const newUser = {
        _openid: OPENID,
        unionid: '',
        nickname: nickname || '微信用户',
        avatar_url: avatar_url || '',
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
          updated_at: now,
        },
        created_at: now,
        updated_at: now,
        last_login_at: now,
      };
      const result = await db.collection('users').add({ data: newUser });
      user = { ...newUser, _id: result._id };
    }
  } catch (err) {
    console.error('[login] 数据库错误', err);
    return { code: 500, message: '服务器错误', data: null, server_time: Date.now() };
  }

  // 生成 token（Phase 1 简化版）
  const token = `${OPENID}_${Date.now()}`;

  return {
    code: 0,
    message: 'success',
    data: {
      token,
      user: {
        openid: user._openid,
        unionid: user.unionid || '',
        nickname: user.nickname || '微信用户',
        avatar_url: user.avatar_url || '',
        vip_level: user.vip_level || 'free',
        vip_expire_at: user.vip_expire_at || null,
        tool_slot_used: user.tool_slot_used || 0,
        tool_slot_max: user.tool_slot_max || 1,
        privacy_mode: user.privacy_mode || 'standard',
        stats_snapshot: user.stats_snapshot || {
          total_decisions: 0,
          total_follow_rate: 0,
          primary_tag: null,
          weekly_decisions: 0,
          updated_at: Date.now(),
        },
      },
      is_new_user: isNewUser,
    },
    server_time: Date.now(),
  };
};
