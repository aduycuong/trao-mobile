import {
  REPORT_REASONS,
  evidenceSummary,
  initialReason,
  isReportTargetType,
  reasonsFor,
  reportNote,
} from '../report-rules';

describe('REPORT_REASONS', () => {
  it('lists the reasons of each target, ending with "Khác", with unique codes', () => {
    for (const type of ['transaction', 'listing', 'user'] as const) {
      const reasons = REPORT_REASONS[type];
      expect(reasons[reasons.length - 1]!.code).toBe('other');
      expect(new Set(reasons.map((reason) => reason.code)).size).toBe(reasons.length);
    }
    expect(REPORT_REASONS.transaction[0]).toMatchObject({
      code: 'cancelled_harm',
      label: 'Bên kia huỷ giao dịch, gây thiệt hại cho tôi',
    });
    expect(REPORT_REASONS.transaction).toHaveLength(7);
    expect(REPORT_REASONS.listing).toHaveLength(6);
    expect(REPORT_REASONS.user).toHaveLength(5);
  });
});

describe('isReportTargetType', () => {
  it('accepts the three targets only', () => {
    expect(isReportTargetType('transaction')).toBe(true);
    expect(isReportTargetType('listing')).toBe(true);
    expect(isReportTargetType('user')).toBe(true);
    expect(isReportTargetType('chat')).toBe(false);
    expect(isReportTargetType(undefined)).toBe(false);
  });
});

describe('reasonsFor and initialReason', () => {
  it('uses the reasons of the server, else the built-in list', () => {
    const custom = [{ code: 'x', label: 'X', hint: '' }];
    expect(reasonsFor('user', custom)).toBe(custom);
    expect(reasonsFor('user', [])).toBe(REPORT_REASONS.user);
    expect(reasonsFor('user', undefined)).toBe(REPORT_REASONS.user);
  });

  it('picks the preset reason (the other side cancelled) only when it is offered', () => {
    const reasons = REPORT_REASONS.transaction;
    expect(initialReason('cancelled_harm', reasons)).toBe('cancelled_harm');
    expect(initialReason('scam', reasons)).toBeNull();
    expect(initialReason(null, reasons)).toBeNull();
  });
});

describe('reportNote', () => {
  it('says Trao asks the other side for a statement on a transaction', () => {
    expect(reportNote('transaction', 'Nam')).toBe(
      'Trao sẽ hỏi giải trình của Nam trước khi quyết định. Báo cáo sai sự thật có thể bị phạt theo chính sách của Trao.'
    );
  });

  it('says the reported person does not learn who reported otherwise', () => {
    expect(reportNote('user', 'bên kia')).toContain('Người bị báo cáo không biết ai đã báo cáo.');
    expect(reportNote('listing', 'bên kia')).toContain(
      'Người bị báo cáo không biết ai đã báo cáo.'
    );
  });
});

describe('evidenceSummary', () => {
  it('joins the photos and the chat', () => {
    expect(evidenceSummary(2, true, 'Nam')).toBe('2 ảnh · chat với Nam');
    expect(evidenceSummary(0, true, 'Nam')).toBe('chat với Nam');
    expect(evidenceSummary(3, false, 'Nam')).toBe('3 ảnh');
    expect(evidenceSummary(0, false, 'Nam')).toBe('Chưa có');
  });
});
