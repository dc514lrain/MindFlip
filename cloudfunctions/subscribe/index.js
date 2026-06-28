// 订阅消息云函数
// 职责: 订阅消息授权状态更新、发送订阅消息推送

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// ═══ 订阅消息模板 ID — 在微信公众平台「订阅消息」中申请 ════════════════
// 模板 1: 待办事项提醒
//   字段: thing1(待办名称) / number2(待办事项数量) / thing3(备注)
//   用途: 24h 决策复盘聚合推送
//   模板 ID: 00_yc3if3s1BFTytpy49f2P8_tElEc3DibxcNzN5d88
const INBOX_TEMPLATE_ID = '00_yc3if3s1BFTytpy49f2P8_tElEc3DibxcNzN5d88';

// 模板 2: 测评报告生成通知
//   字段: thing1(测评项目) / phrase2(测评结果) / thing3(备注)
//   用途: 每周五人格周刊出刊通知
//   模板 ID: EVk9xTAqm-Fb8Sp_VQTv55ZypUcEpAGJxq7rJOiBLSM
const WEEKLY_TEMPLATE_ID = 'EVk9xTAqm-Fb8Sp_VQTv55ZypUcEpAGJxq7rJOiBLSM';

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();

  if (!OPENID) {
    return { code: 401, message: '未登录', data: null, server_time: Date.now() };
  }

  const db = cloud.database();
  const { action, is_authorized } = event;

  // ═══ update_auth — 更新用户订阅授权状态 ════════════════════════════════
  if (action === 'update_auth') {
    const now = Date.now();
    const existing = await db.collection('subscribe_config')
      .where({ _openid: OPENID })
      .limit(1)
      .get();

    if (existing.data.length > 0) {
      const doc = existing.data[0];
      const updateData = {};
      updateData.is_authorized = is_authorized;
      updateData.updated_at = now;
      if (is_authorized) {
        updateData.authorized_at = now;
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

  // ═══ get_auth — 查询用户订阅授权状态 ═══════════════════════════════════
  if (action === 'get_auth') {
    const existing = await db.collection('subscribe_config')
      .where({ _openid: OPENID })
      .limit(1)
      .get();

    if (existing.data.length > 0) {
      const doc = existing.data[0];
      return {
        code: 0,
        message: 'success',
        data: {
          is_authorized: doc.is_authorized ?? false,
          rejected_count: doc.rejected_count ?? 0,
          banner_dismissed: doc.banner_dismissed ?? false,
        },
        server_time: Date.now(),
      };
    }

    return {
      code: 0,
      message: 'success',
      data: { is_authorized: false, rejected_count: 0, banner_dismissed: false },
      server_time: Date.now(),
    };
  }

  // ═══ send_push — 发送订阅消息 (仅供 scheduler 云函数内部调用) ═════════
  if (action === 'send_push') {
    const { touser, count, template_type, tag_name } = event;
    if (!touser) {
      return { code: 422, message: '缺少必要参数', data: null, server_time: Date.now() };
    }

    try {
      let templateId, pushData;

      if (template_type === 'weekly') {
        // ── 模板 2: 测评报告生成通知 ──
        // thing1=测评项目, phrase2=测评结果, thing3=备注
        templateId = WEEKLY_TEMPLATE_ID;
        pushData = {
          thing1: { value: '个人决策行为周刊' },
          phrase2: { value: tag_name || '理性决策者' },
          thing3: { value: '点击查看本周完整报告' },
        };
      } else {
        // ── 模板 1: 待办事项提醒 (默认) ──
        // thing1=待办名称, number2=待办事项数量, thing3=备注
        templateId = INBOX_TEMPLATE_ID;
        pushData = {
          thing1: { value: '决策复盘提醒' },
          number2: { value: count || 0 },
          thing3: { value: '点击完成复盘标记' },
        };
      }

      const result = await cloud.openapi.subscribeMessage.send({
        touser: touser,
        templateId: templateId,
        page: 'pages/review/review',
        data: pushData,
      });
      return { code: 0, message: 'success', data: result, server_time: Date.now() };
    } catch (err) {
      console.error('[subscribe] 发送失败', err);
      return { code: err?.errCode || 500, message: '发送失败', data: null, server_time: Date.now() };
    }
  }

  return { code: 400, message: '未知的 action', data: null, server_time: Date.now() };
};
