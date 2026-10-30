import { stripDiacritics } from './chat-list';

export type ScamSign = 'deposit' | 'otp' | 'link' | 'off_platform';

export const SCAM_WARNINGS: Record<ScamSign, string> = {
  deposit: 'Có dấu hiệu đòi chuyển tiền trước. Chỉ trả tiền khi đã gặp, kiểm tra và nhận đồ.',
  otp: 'Không đọc hoặc gửi mã OTP, mã xác nhận cho bất kỳ ai, kể cả người nhận là của Trao.',
  link: 'Cẩn thận với đường link lạ. Đừng nhập thông tin cá nhân hay thanh toán qua link.',
  off_platform: 'Người này rủ liên hệ ngoài Trao. Giao dịch ngoài Trao không được bảo vệ.',
};

/** Typed-out forms of "pay first", deposit and transfer in advance. */
const DEPOSIT =
  /\b(dat coc|chuyen coc|dong coc|coc truoc|ung truoc|(chuyen khoan|chuyen tien|ck|thanh toan|dong tien|gui tien) truoc)\b/;
/** A one-time code someone asks for: OTP, confirmation or SMS code. */
const OTP = /\b(otp|ma xac (nhan|thuc|minh)|ma sms|ma bao mat|ma pin)\b/;
/** Another app or a phone number to move the talk out of Trao. */
const OFF_PLATFORM =
  /\b(zalo|telegram|viber|whatsapp|messenger|facebook|instagram|wechat|kakao|fb|ig)\b|\b(lien he|nhan|goi|kb|ket ban)\b.{0,20}\b0\d{9,10}\b|\b0\d{9,10}\b/;
/** A web address: with a scheme, `www.`, or a bare domain with a common ending. */
const LINK =
  /(https?:\/\/|www\.)\S+|\b[a-z0-9-]{2,}\.(com|vn|net|me|link|xyz|top|cc|app|co|info|site|online|shop|store|click|ly)\b/;

/**
 * The signs of a scam in a message (same rules as the web app): asking to pay or deposit first,
 * asking for a one-time code, an outside link, or moving to another app or a phone number. It
 * looks at the words only, so it can be wrong; it only decides whether the receiver sees a
 * caution, never blocks a message. `ownHost` is the app's own host, so links to Trao do not count.
 */
export function detectScamSigns(text: string, ownHost?: string): ScamSign[] {
  const plain = stripDiacritics(text);
  const signs: ScamSign[] = [];
  if (DEPOSIT.test(plain)) signs.push('deposit');
  if (OTP.test(plain)) signs.push('otp');
  const withoutOwn = ownHost ? plain.split(ownHost.toLowerCase()).join(' ') : plain;
  if (LINK.test(withoutOwn)) signs.push('link');
  if (OFF_PLATFORM.test(plain)) signs.push('off_platform');
  return signs;
}
