// 决策大师 (MindFlip) — DataService 防腐层
// 职责: 封装所有云函数调用与本地缓存，页面/Store 不得直接调用 wx.cloud.*

import { Logger } from '../utils/logger';

// ═══ 通用响应结构 ════════════════════════════════════════════════════════════
interface CloudResponse<T> {
  code: number;
  message: string;
  data: T | null;
  server_time: number;
}

interface DataServiceError extends Error {
  code: number;
}

// ═══ 内部工具函数 ════════════════════════════════════════════════════════════
async function callFunction<T>(name: string, data: Record<string, unknown>): Promise<T> {
  const res = await wx.cloud.callFunction({ name, data }) as CloudResponse<T>;
  if (res.code === 0) return res.data as T;
  throw new Error(`[DataService] ${name} failed: ${res.message} (code: ${res.code})`);
}

// ═══ DataService ═══════════════════════════════════════════════════════════════
class DataService {
  private tokenKey = 'token';
  private personalityCacheKey = 'personality_cache';
  private userCacheKey = 'user_cache';

  // ── 用户 ──────────────────────────────────────────────────────────────────

  async login(code: string): Promise<unknown> {
    Logger.debug('DataService.login', { code });
    return callFunction('login', { code });
  }

  getCachedUser(): unknown | null {
    const raw = wx.getStorageSync(this.userCacheKey);
    return raw ? JSON.parse(raw) : null;
  }

  cacheUser(user: unknown): void {
    wx.setStorageSync(this.userCacheKey, JSON.stringify(user));
  }

  // ── 决策记录 ─────────────────────────────────────────────────────────────

  async saveDecision(decision: {
    action: 'create';
    tool_type: string;
    raw_result: string;
    semantic_result: string;
    user_memo?: string;
  }): Promise<unknown> {
    return callFunction('decision', decision);
  }

  async syncDecisions(decisions: unknown[]): Promise<void> {
    return callFunction('decision', { action: 'sync', decisions });
  }

  // ── 待决清单 ──────────────────────────────────────────────────────────────

  async queryInbox(pageSize = 20, pageToken?: string): Promise<unknown> {
    return callFunction('inbox', { action: 'list', page_size: pageSize, page_token: pageToken });
  }

  async markDecision(decisionId: string, followStatus: string, breakReason?: string): Promise<unknown> {
    return callFunction('inbox', {
      action: 'mark',
      decision_id: decisionId,
      follow_status: followStatus,
      break_reason: breakReason,
    });
  }

  async getUnreadCount(): Promise<number> {
    const res = await callFunction<{ count: number }>('inbox', { action: 'unread' });
    return res.count;
  }

  // ── 统计 ─────────────────────────────────────────────────────────────────

  async getGlobalStats(): Promise<unknown> {
    return callFunction('stats', { scope: 'global' });
  }

  async getToolStats(toolId: string): Promise<unknown> {
    return callFunction('stats', { scope: 'tool', tool_id: toolId });
  }

  // ── 人格标签 ─────────────────────────────────────────────────────────────

  async getPersonality(period: 'weekly' | 'all_time' = 'weekly'): Promise<unknown> {
    return callFunction('personality', { period });
  }

  cachePersonality(personality: unknown, ttlMs: number): void {
    const expiresAt = Date.now() + ttlMs;
    wx.setStorageSync(this.personalityCacheKey, JSON.stringify({ personality, expiresAt }));
  }

  getCachedPersonality(): unknown | null {
    const raw = wx.getStorageSync(this.personalityCacheKey);
    if (!raw) return null;
    const { personality, expiresAt } = JSON.parse(raw);
    if (Date.now() > expiresAt) {
      wx.removeStorageSync(this.personalityCacheKey);
      return null;
    }
    return personality;
  }

  // ── 订阅消息 ─────────────────────────────────────────────────────────────

  async updateSubscribeAuth(isAuthorized: boolean): Promise<void> {
    return callFunction('subscribe', { action: 'update_auth', is_authorized: isAuthorized });
  }

  // ── 本地缓存 ─────────────────────────────────────────────────────────────

  getLocalCache<T>(key: string): T | null {
    const raw = wx.getStorageSync(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  setLocalCache<T>(key: string, value: T, ttlMs?: number): void {
    if (ttlMs) {
      const expiresAt = Date.now() + ttlMs;
      wx.setStorageSync(key, JSON.stringify({ value, expiresAt }));
    } else {
      wx.setStorageSync(key, JSON.stringify(value));
    }
  }

  // ── Phase 2 预留 ─────────────────────────────────────────────────────────

  async encrypt(template: string, pin: string): Promise<string> {
    // TODO: Phase 2 填充 CryptoJS AES-256-GCM 实现
    throw new Error('encrypt() not implemented — Phase 2 feature');
  }

  async decrypt(encrypted: string, pin: string): Promise<string> {
    // TODO: Phase 2 填充 CryptoJS AES-256-GCM 实现
    throw new Error('decrypt() not implemented — Phase 2 feature');
  }
}

export const dataService = new DataService();
export { DataService };
