import { Link } from 'react-router-dom';
import { THEME_LABEL_MAP } from "../constants/themeConfig.js"; // { policy: "사건/정책", ... }
const themeLabel = THEME_LABEL_MAP[item.theme] ?? "기타";
const displayTitle = `${themeLabel} | ${item.title}`;
<Link to={`/issue/${item.id}`} className="...">{displayTitle}</Link>

// 테마 키 → 보기 이름 매핑 (필요에 맞게 수정/추가)
const THEME_LABELS = {
  policy: '사건/정책',
  stocks: '주식정보',
  parenting: '육아정보',
  lifestyle: '생활정보',
  health: '건강정보',
  groupbuy: '공동구매정보',
  support: '정부지원정보',
  admin: '관리자',
};

// theme, title, id, createdAt 형태를 가정
// createdAt은 문자열(YYYY-MM-DD HH:mm) 또는 Date → 표시용 포맷 함수로 변환
function formatDate(d) {
  if (!d) return '';
  if (typeof d === 'string') return d;
  try {
    const dt = d.toDate ? d.toDate() : d;
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
      .format(dt)
      .replace(/\./g, '-')
      .replace(/\s/g, ' ')
      .replace(/- /g, '-')
      .replace(/ $/, '');
  } catch {
    return '';
  }
}

export default function RecentSection({ items = [], title = '최근 등록 10개', moreLink = '/recent' }) {
  return (
    <section className="rounded-lg border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        {moreLink && (
          <Link to={moreLink} className="text-sm text-indigo-600 hover:underline">
            더 보기 →
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-500">아직 등록된 게시물이 없습니다.</div>
      ) : (
        <ul className="divide-y">
          {items.map((post) => {
            const theme = post.theme || post.category || 'lifestyle';
            const themeName = THEME_LABELS[theme] || theme;
            const href = `/post/${post.id}`; // 라우팅 규칙에 맞게 수정
            return (
              <li key={post.id} className="flex items-center justify-between gap-4 py-2">
                <Link
                  to={href}
                  className="line-clamp-1 flex-1 text-sm text-gray-900 hover:underline"
                  title={`${themeName} | ${post.title}`}
                >
                  {/* 핵심: "테마명 | 제목" 포맷 */}
                  <span className="font-medium text-indigo-700">{themeName}</span>
                  <span className="mx-1 text-gray-400">|</span>
                  <span>{post.title}</span>
                </Link>
                <time className="shrink-0 text-xs text-gray-500">{formatDate(post.createdAt)}</time>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
