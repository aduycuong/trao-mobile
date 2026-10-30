import type { ReportReasonOption, ReportStatus, ReportTargetType } from '@/types/reports';

/** Reasons by what is reported (web `lib/reports/constants`, canvas Report). A report stores the code. */
export const REPORT_REASONS: Record<ReportTargetType, ReportReasonOption[]> = {
  transaction: [
    {
      code: 'cancelled_harm',
      label: 'Bên kia huỷ giao dịch, gây thiệt hại cho tôi',
      hint: 'Ví dụ đã đi đến chỗ hẹn, đã từ chối người khác',
    },
    {
      code: 'not_as_described',
      label: 'Hàng không đúng mô tả',
      hint: 'Sai tình trạng, thiếu phụ kiện, hàng giả',
    },
    { code: 'no_show', label: 'Không đến hẹn, không phản hồi', hint: '' },
    {
      code: 'wont_confirm',
      label: 'Không chịu xác nhận hoàn thành',
      hint: 'Đã giao nhận xong nhưng bên kia không xác nhận',
    },
    {
      code: 'scam_prepay',
      label: 'Đòi chuyển tiền trước, có dấu hiệu lừa đảo',
      hint: '',
    },
    { code: 'harassment', label: 'Xúc phạm, quấy rối', hint: '' },
    { code: 'other', label: 'Khác', hint: '' },
  ],
  listing: [
    { code: 'prohibited', label: 'Hàng cấm hoặc nguy hiểm', hint: '' },
    { code: 'fake_photos', label: 'Ảnh không phải đồ thật', hint: 'Ảnh mạng, ảnh của người khác' },
    { code: 'false_info', label: 'Thông tin sai, có dấu hiệu lừa đảo', hint: '' },
    { code: 'duplicate_spam', label: 'Trùng lặp, spam', hint: '' },
    { code: 'external_contact', label: 'Có số điện thoại hoặc link ngoài', hint: '' },
    { code: 'other', label: 'Khác', hint: '' },
  ],
  user: [
    { code: 'scam', label: 'Lừa đảo', hint: '' },
    { code: 'harassment', label: 'Xúc phạm, quấy rối', hint: '' },
    { code: 'impersonation', label: 'Giả mạo người khác', hint: '' },
    { code: 'spam', label: 'Spam, quảng cáo', hint: '' },
    { code: 'other', label: 'Khác', hint: '' },
  ],
};

export const REPORT_DESCRIPTION_MAX_LENGTH = 1000;
export const REPORT_MAX_EVIDENCE = 6;
export const CASE_TEXT_MAX_LENGTH = 1000;
export const APPEAL_REASON_MAX_LENGTH = 1000;

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  submitted: 'Đã gửi',
  in_review: 'Đang xem xét',
  resolved: 'Đã có kết quả',
};

/** Colors of the status pill (canvas Report, step "status"). */
export const REPORT_STATUS_STYLE: Record<ReportStatus, { bg: string; fg: string; dot: string }> = {
  submitted: { bg: '#F1F4F7', fg: '#33414D', dot: '#8896A3' },
  in_review: { bg: '#FFF4D6', fg: '#8A5A00', dot: '#E8A200' },
  resolved: { bg: '#E3F4EA', fg: '#1E6B43', dot: '#2F9E63' },
};

export const REPORT_QUESTION: Record<ReportTargetType, string> = {
  transaction: 'Giao dịch gặp vấn đề gì?',
  listing: 'Tin đăng có vấn đề gì?',
  user: 'Người dùng này có vấn đề gì?',
};

export function isReportTargetType(value: unknown): value is ReportTargetType {
  return value === 'transaction' || value === 'listing' || value === 'user';
}

/** The reasons to offer: the ones the server sent, else the built-in list. */
export function reasonsFor(
  type: ReportTargetType,
  fromServer: ReportReasonOption[] | undefined
): ReportReasonOption[] {
  return fromServer && fromServer.length > 0 ? fromServer : REPORT_REASONS[type];
}

/** The reason picked at the start when it is one of the offered ones, else none. */
export function initialReason(preset: string | null, reasons: ReportReasonOption[]): string | null {
  return preset && reasons.some((reason) => reason.code === preset) ? preset : null;
}

/** The yellow note above the button of the report form. */
export function reportNote(type: ReportTargetType, partner: string): string {
  const lead =
    type === 'transaction'
      ? `Trao sẽ hỏi giải trình của ${partner} trước khi quyết định.`
      : 'Người bị báo cáo không biết ai đã báo cáo.';
  return `${lead} Báo cáo sai sự thật có thể bị phạt theo chính sách của Trao.`;
}

/** "2 ảnh · chat với Nam", or "Chưa có". */
export function evidenceSummary(
  evidenceCount: number,
  chatAttached: boolean,
  partner: string
): string {
  return (
    [evidenceCount > 0 ? `${evidenceCount} ảnh` : null, chatAttached ? `chat với ${partner}` : null]
      .filter(Boolean)
      .join(' · ') || 'Chưa có'
  );
}
