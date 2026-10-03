import type { CalloutStatus, OpsNote, Vulnerability } from './types';

/** Glossary wording (規格書第二章). Use these instead of re-typing labels in screens. */
export const STATUS_LABEL: Record<CalloutStatus, string> = {
  pending: '尚未確認',
  ok: '一切正常',
  need: '需要支援',
  damage: '嚴重受損',
};

export const OUTCOME_HINT: Record<Exclude<CalloutStatus, 'pending'>, string> = {
  ok: '人員與設施均無異常',
  need: '需要人力、物資或醫療',
  damage: '建物受損或需緊急撤離',
};

export const VULNERABILITY_LABEL: Record<Vulnerability, string> = { 1: '低', 2: '中', 3: '高' };

export const OPS_LABEL: Record<OpsNote, string> = { contacted: '已聯繫', 'site-check': '需現地確認' };

export const toneClass = (status: CalloutStatus) => `tone-${status}`;
