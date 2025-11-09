// frontend/src/pages/IssuePage.jsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import IntensityBar from '../components/IntensityBar.jsx';
import MetaTags from '../components/MetaTags.jsx';
import SectionCard from '../components/SectionCard.jsx';
import ParentingGuideView from '../components/issue/ParentingGuideView.jsx';
import LifestyleGuideView from '../components/issue/LifestyleGuideView.jsx';
import HealthGuideView from '../components/issue/HealthGuideView.jsx';
import StockGuideView from '../components/issue/StockGuideView.jsx';
import SupportGuideView from '../components/issue/SupportGuideView.jsx';
import { getThemeById } from '../constants/themeConfig.js';
import {
  addIssueComment,
  getIssueById,
  getIssueComments,
  getIssueUserState,
  submitIssueVote,
  toggleIssueScrap
} from '../firebaseClient.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useAuthDialog } from '../contexts/AuthDialogContext.jsx';

const PROGRESSIVE_NOTE =
  '아래 내용은 일부 진보측 주장과 전망이며, 확실하지 않은 사실일 수 있습니다.';
const CONSERVATIVE_NOTE =
  '아래 내용은 일부 보수측 주장과 전망이며, 확실하지 않은 사실일 수 있습니다.';
const IMPACT_NOTE = '이 섹션은 중립적 해석과 체감 영향을 요약한 설명입니다. (ChatGPT의 의견)';

const INITIAL_STATS = { upVotes: 0, downVotes: 0, scrapCount: 0, commentCount: 0 };
const INITIAL_USER_INTERACTION = { hasUpvoted: false, hasDownvoted: false, hasScrapped: false };

function toArray(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? '').trim()).filter(Boolean);
  }
  return String(value)
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  return 0;
}

function IssuePage() {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const { requireAuth } = useAuthDialog();
  const [issue, setIssue] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [issueStats, setIssueStats] = useState(INITIAL_STATS);
  const [userInteraction, setUserInteraction] = useState(INITIAL_USER_INTERACTION);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [commentFeedback, setCommentFeedback] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [isShareOpen, setShareOpen] = useState(false);

  const loadComments = useCallback(async (issueId) => {
    if (!issueId) {
      setComments([]);
      return;
    }
    setCommentsLoading(true);
    setCommentFeedback('');
    try {
      const list = await getIssueComments(issueId, { limitCount: 120 });
      setComments(list);
    } catch (err) {
      console.error('댓글 불러오기 실패:', err);
      setCommentFeedback('댓글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setCommentsLoading(false);
    }
  }, []);

  const refreshUserState = useCallback(async (issueId, uid) => {
    if (!issueId || !uid) {
      setUserInteraction(INITIAL_USER_INTERACTION);
      return;
    }
    try {
      const state = await getIssueUserState(issueId, uid);
      setUserInteraction({
        hasUpvoted: Boolean(state?.hasUpvoted),
        hasDownvoted: Boolean(state?.hasDownvoted),
        hasScrapped: Boolean(state?.hasScrapped)
      });
    } catch (err) {
      console.error('사용자 상호작용 상태 불러오기 실패:', err);
    }
  }, []);

  useEffect(() => {
    if (!id) {
      setError('이슈 ID가 올바르지 않습니다.');
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    async function loadIssue() {
      setIsLoading(true);
      setError('');
      try {
        const data = await getIssueById(id);
        if (!data) {
          throw new Error('해당 이슈를 찾을 수 없습니다.');
        }
        if (!isMounted) {
          return;
        }
        setIssue(data);
        setIssueStats(data.stats ?? INITIAL_STATS);
        setShareOpen(false);
        setCommentInput('');
        setCommentFeedback('');
        setUserInteraction(INITIAL_USER_INTERACTION);
        await loadComments(data.id);
      } catch (err) {
        console.error('Firestore에서 이슈 상세 불러오기 실패:', err);
        if (isMounted) {
          setError(err.message || '이슈 정보를 불러오지 못했습니다.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadIssue();

    return () => {
      isMounted = false;
    };
  }, [id, loadComments]);

  useEffect(() => {
    if (!toastMessage) {
      return undefined;
    }
    const timer = window.setTimeout(() => setToastMessage(''), 2000);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    if (!issue?.id) {
      return;
    }
    if (!user) {
      setUserInteraction(INITIAL_USER_INTERACTION);
      return;
    }
    refreshUserState(issue.id, user.uid);
  }, [issue?.id, user, refreshUserState]);

  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
  const themeInfo = issue ? getThemeById(issue.theme) : null;
  const themeLabel = themeInfo?.label ?? '사건/정책';
  const metaTitle = issue ? `${issue.title} - infoall` : 'infoall';
  const metaDescription = issue?.easySummary || issue?.summaryCard || `${themeLabel} 주제의 정보를 제공합니다.`;
  const easySummary = issue?.easySummary || '';
  const keyPoints = useMemo(() => toArray(issue?.keyPoints), [issue?.keyPoints]);
  const backgroundParagraphs = useMemo(() => toArray(issue?.background), [issue?.background]);
  const progressiveView = issue?.progressiveView
    ? {
        ...issue.progressiveView,
        bullets: toArray(issue.progressiveView.bullets),
        note: issue.progressiveView.note || PROGRESSIVE_NOTE
      }
    : null;
  const conservativeView = issue?.conservativeView
    ? {
        ...issue.conservativeView,
        bullets: toArray(issue.conservativeView.bullets),
        note: issue.conservativeView.note || CONSERVATIVE_NOTE
      }
    : null;
  const impactToLife = issue?.impactToLife
    ? { ...issue.impactToLife, note: issue.impactToLife.note || IMPACT_NOTE }
    : null;

  const parentingGuide = issue?.parentingGuide ?? null;
  const lifestyleGuide = issue?.lifestyleGuide ?? null;
  const healthGuide = issue?.healthGuide ?? null;
  const stockGuide = issue?.stockGuide ?? null;
  const supportGuide = issue?.supportGuide ?? null;
  const groupbuyLink = typeof issue?.groupbuyLink === 'string' ? issue.groupbuyLink.trim() : '';
  const shouldShowGroupbuyLink = issue?.theme === 'groupbuy' && groupbuyLink.length > 0;

  const generateHTML = () => {
    if (!issue) return '';

    const escapeHtml = (text) => {
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    let themeSpecificContent = '';

    if (issue.theme === 'groupbuy' && shouldShowGroupbuyLink) {
      themeSpecificContent += `
    <div class="section groupbuy-link">
      <h2 class="section-title">관련 링크</h2>
      <p><a href="${escapeHtml(groupbuyLink)}" target="_blank" rel="noopener">${escapeHtml(groupbuyLink)}</a></p>
      <p>위 링크에서 공동구매 참여 가능합니다!</p>
    </div>`;
    }

    // 육아 테마
    if (issue.theme === 'parenting' && parentingGuide) {
      if (parentingGuide.overview) {
        themeSpecificContent += `
    <div class="section">
      <h2 class="section-title">육아 테마 개요</h2>
      <p>${escapeHtml(parentingGuide.overview)}</p>
    </div>`;
      }
      
      if (Array.isArray(parentingGuide.generalTips) && parentingGuide.generalTips.length > 0) {
        themeSpecificContent += `
    <div class="section">
      <h2 class="section-title">전체 공통 팁</h2>
      <ul>${parentingGuide.generalTips.map(tip => `<li>${escapeHtml(tip)}</li>`).join('')}</ul>
    </div>`;
      }

      if (Array.isArray(parentingGuide.ageGroups)) {
        parentingGuide.ageGroups.forEach(group => {
          if (!group.ageRange && !group.focusSummary) return;
          themeSpecificContent += `
    <div class="section parenting">
      <h2 class="section-title">${escapeHtml(group.ageRange || '연령대')}</h2>
      ${group.focusSummary ? `<p>${escapeHtml(group.focusSummary)}</p>` : ''}
      ${Array.isArray(group.developmentFocus) && group.developmentFocus.length > 0 ? `
        <h3 style="font-size: 1rem; margin-top: 1rem; font-weight: 600;">발달 포인트</h3>
        <ul>${group.developmentFocus.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      ` : ''}
      ${Array.isArray(group.careTips) && group.careTips.length > 0 ? `
        <h3 style="font-size: 1rem; margin-top: 1rem; font-weight: 600;">돌봄 팁</h3>
        <ul>${group.careTips.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      ` : ''}
      ${Array.isArray(group.resources) && group.resources.length > 0 ? `
        <h3 style="font-size: 1rem; margin-top: 1rem; font-weight: 600;">추천 자료</h3>
        <ul>${group.resources.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      ` : ''}
    </div>`;
        });
      }

      if (Array.isArray(parentingGuide.emergencyContacts) && parentingGuide.emergencyContacts.length > 0) {
        themeSpecificContent += `
    <div class="section emergency">
      <h2 class="section-title">긴급/상담 연락처</h2>
      <ul>${parentingGuide.emergencyContacts.map(contact => `<li>${escapeHtml(contact)}</li>`).join('')}</ul>
    </div>`;
      }
    }

    // 건강 테마
    if (issue.theme === 'health' && healthGuide) {
      if (healthGuide.overview) {
        themeSpecificContent += `
    <div class="section">
      <h2 class="section-title">건강 테마 개요</h2>
      <p>${escapeHtml(healthGuide.overview)}</p>
    </div>`;
      }

      if (Array.isArray(healthGuide.lifestyleTips) && healthGuide.lifestyleTips.length > 0) {
        themeSpecificContent += `
    <div class="section">
      <h2 class="section-title">생활 습관 팁</h2>
      <ul>${healthGuide.lifestyleTips.map(tip => `<li>${escapeHtml(tip)}</li>`).join('')}</ul>
    </div>`;
      }

      if (Array.isArray(healthGuide.conditions)) {
        healthGuide.conditions.forEach(condition => {
          if (!condition.name && !condition.summary) return;
          themeSpecificContent += `
    <div class="section health">
      <h2 class="section-title">${escapeHtml(condition.name || '건강 주제')}</h2>
      ${condition.summary ? `<p>${escapeHtml(condition.summary)}</p>` : ''}
      ${Array.isArray(condition.warningSigns) && condition.warningSigns.length > 0 ? `
        <h3 style="font-size: 1rem; margin-top: 1rem; font-weight: 600;">경고 신호</h3>
        <ul>${condition.warningSigns.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      ` : ''}
      ${Array.isArray(condition.careTips) && condition.careTips.length > 0 ? `
        <h3 style="font-size: 1rem; margin-top: 1rem; font-weight: 600;">관리/돌봄 팁</h3>
        <ul>${condition.careTips.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      ` : ''}
      ${Array.isArray(condition.resources) && condition.resources.length > 0 ? `
        <h3 style="font-size: 1rem; margin-top: 1rem; font-weight: 600;">추천 자료</h3>
        <ul>${condition.resources.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      ` : ''}
    </div>`;
        });
      }

      if (Array.isArray(healthGuide.emergencyGuide) && healthGuide.emergencyGuide.length > 0) {
        themeSpecificContent += `
    <div class="section emergency">
      <h2 class="section-title">긴급 대응 가이드</h2>
      <ul>${healthGuide.emergencyGuide.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    </div>`;
      }
    }

    // 생활정보 테마
    if (issue.theme === 'lifestyle' && lifestyleGuide) {
      if (lifestyleGuide.overview) {
        themeSpecificContent += `
    <div class="section">
      <h2 class="section-title">생활정보 개요</h2>
      <p>${escapeHtml(lifestyleGuide.overview)}</p>
    </div>`;
      }

      if (Array.isArray(lifestyleGuide.quickTips) && lifestyleGuide.quickTips.length > 0) {
        themeSpecificContent += `
    <div class="section">
      <h2 class="section-title">생활 꿀팁</h2>
      <ul>${lifestyleGuide.quickTips.map(tip => `<li>${escapeHtml(tip)}</li>`).join('')}</ul>
    </div>`;
      }

      if (Array.isArray(lifestyleGuide.hotItems) && lifestyleGuide.hotItems.length > 0) {
        themeSpecificContent += `
    <div class="section lifestyle">
      <h2 class="section-title">추천 아이템</h2>
      ${lifestyleGuide.hotItems.map(item => `
        <div class="item-card">
          ${item.name ? `<h3>${escapeHtml(item.name)}</h3>` : ''}
          ${item.highlight ? `<p>${escapeHtml(item.highlight)}</p>` : ''}
          ${item.link ? `<a href="${escapeHtml(item.link)}" target="_blank">링크 바로가기</a>` : ''}
        </div>
      `).join('')}
    </div>`;
      }

      if (Array.isArray(lifestyleGuide.hotDeals) && lifestyleGuide.hotDeals.length > 0) {
        themeSpecificContent += `
    <div class="section deal">
      <h2 class="section-title">핫딜 정보</h2>
      ${lifestyleGuide.hotDeals.map(deal => `
        <div class="item-card">
          ${deal.title ? `<h3>${escapeHtml(deal.title)}</h3>` : ''}
          ${deal.description ? `<p>${escapeHtml(deal.description)}</p>` : ''}
          ${deal.priceInfo ? `<p style="color: #059669; font-weight: 600;">${escapeHtml(deal.priceInfo)}</p>` : ''}
          ${deal.link ? `<a href="${escapeHtml(deal.link)}" target="_blank">링크 바로가기</a>` : ''}
        </div>
      `).join('')}
    </div>`;
      }
    }

    // 주식정보 테마
    if (issue.theme === 'stocks' && stockGuide) {
      if (stockGuide.overview) {
        themeSpecificContent += `
    <div class="section">
      <h2 class="section-title">주식정보 개요</h2>
      <p>${escapeHtml(stockGuide.overview)}</p>
    </div>`;
      }

      if (stockGuide.marketSummary) {
        themeSpecificContent += `
    <div class="section">
      <h2 class="section-title">시장 요약</h2>
      <p>${escapeHtml(stockGuide.marketSummary)}</p>
    </div>`;
      }

      if (Array.isArray(stockGuide.sectorHighlights) && stockGuide.sectorHighlights.length > 0) {
        themeSpecificContent += `
    <div class="section stock">
      <h2 class="section-title">섹터 하이라이트</h2>
      ${stockGuide.sectorHighlights.map(sector => `
        <div class="item-card">
          ${sector.name ? `<h3>${escapeHtml(sector.name)}</h3>` : ''}
          ${sector.outlook ? `<p>${escapeHtml(sector.outlook)}</p>` : ''}
          ${Array.isArray(sector.leaders) && sector.leaders.length > 0 ? `
            <p><strong>대표 종목:</strong> ${sector.leaders.map(l => escapeHtml(l)).join(', ')}</p>
          ` : ''}
        </div>
      `).join('')}
    </div>`;
      }

      if (Array.isArray(stockGuide.companyAnalyses) && stockGuide.companyAnalyses.length > 0) {
        themeSpecificContent += `
    <div class="section stock">
      <h2 class="section-title">기업 분석</h2>
      ${stockGuide.companyAnalyses.map(company => `
        <div class="item-card">
          ${company.name ? `<h3>${escapeHtml(company.name)}</h3>` : ''}
          ${company.thesis ? `<p>${escapeHtml(company.thesis)}</p>` : ''}
          ${Array.isArray(company.catalysts) && company.catalysts.length > 0 ? `
            <p><strong style="color: #059669;">촉매:</strong></p>
            <ul>${company.catalysts.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul>
          ` : ''}
          ${Array.isArray(company.risks) && company.risks.length > 0 ? `
            <p><strong style="color: #dc2626;">리스크:</strong></p>
            <ul>${company.risks.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>
          ` : ''}
          ${company.valuation ? `<p><em>${escapeHtml(company.valuation)}</em></p>` : ''}
          ${company.technicalLevels ? `<p><strong>기술적 구간:</strong> ${escapeHtml(company.technicalLevels)}</p>` : ''}
        </div>
      `).join('')}
    </div>`;
      }

      if (Array.isArray(stockGuide.watchlist) && stockGuide.watchlist.length > 0) {
        themeSpecificContent += `
    <div class="section">
      <h2 class="section-title">워치리스트</h2>
      <ul>${stockGuide.watchlist.map(w => `<li>${escapeHtml(w)}</li>`).join('')}</ul>
    </div>`;
      }
    }

    // 정부지원정보 테마
    if (issue.theme === 'support' && supportGuide) {
      if (supportGuide.overview) {
        themeSpecificContent += `
    <div class="section">
      <h2 class="section-title">정부지원정보 개요</h2>
      <p>${escapeHtml(supportGuide.overview)}</p>
    </div>`;
      }

      if (Array.isArray(supportGuide.programs)) {
        supportGuide.programs.forEach(program => {
          if (!program.name && !program.summary) return;
          themeSpecificContent += `
    <div class="section support">
      <h2 class="section-title">${escapeHtml(program.name || '지원 프로그램')}</h2>
      ${program.summary ? `<p>${escapeHtml(program.summary)}</p>` : ''}
      ${Array.isArray(program.eligibility) && program.eligibility.length > 0 ? `
        <h3 style="font-size: 1rem; margin-top: 1rem; font-weight: 600;">지원 대상</h3>
        <ul>${program.eligibility.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      ` : ''}
      ${Array.isArray(program.benefits) && program.benefits.length > 0 ? `
        <h3 style="font-size: 1rem; margin-top: 1rem; font-weight: 600;">지원 내용</h3>
        <ul>${program.benefits.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      ` : ''}
      ${Array.isArray(program.requiredDocs) && program.requiredDocs.length > 0 ? `
        <h3 style="font-size: 1rem; margin-top: 1rem; font-weight: 600;">필요 서류</h3>
        <ul>${program.requiredDocs.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      ` : ''}
      ${Array.isArray(program.applicationProcess) && program.applicationProcess.length > 0 ? `
        <h3 style="font-size: 1rem; margin-top: 1rem; font-weight: 600;">신청 방법</h3>
        <ul>${program.applicationProcess.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      ` : ''}
    </div>`;
        });
      }

      if (Array.isArray(supportGuide.commonResources) && supportGuide.commonResources.length > 0) {
        themeSpecificContent += `
    <div class="section emergency">
      <h2 class="section-title">공통 참고자료</h2>
      <ul>${supportGuide.commonResources.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
    </div>`;
      }
    }

    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(issue.title)} - infoall</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1e293b; background: #f8fafc; padding: 2rem; }
    .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { padding: 2rem; border-bottom: 1px solid #e2e8f0; }
    .badge { display: inline-block; background: #f1f5f9; color: #475569; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; margin-right: 0.5rem; }
    .title { font-size: 2rem; font-weight: 700; margin: 1rem 0; }
    .summary { color: #475569; margin-top: 1rem; }
    .section { padding: 2rem; border-bottom: 1px solid #e2e8f0; }
    .section:last-child { border-bottom: none; }
    .section-title { font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; }
    .progressive { background: #ecfdf5; }
    .conservative { background: #fef2f2; }
    .parenting { background: #fce7f3; }
    .health { background: #e0f2fe; }
    .lifestyle { background: #d1fae5; }
    .stock { background: #fef3c7; }
    .support { background: #f5f3ff; }
    .deal { background: #fee2e2; }
    .emergency { background: #fee2e2; border-left: 4px solid #dc2626; }
    ul { margin-left: 1.5rem; margin-top: 0.5rem; }
    li { margin: 0.5rem 0; }
    .source-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 1rem; margin: 0.5rem 0; }
    .item-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 1rem; margin: 1rem 0; }
    .item-card h3 { font-size: 1.1rem; margin-bottom: 0.5rem; }
    .item-card a { color: #3b82f6; text-decoration: none; }
    .item-card a:hover { text-decoration: underline; }
    h3 { margin-top: 1rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <span class="badge">${escapeHtml(themeLabel)}</span>
        <span class="badge">${escapeHtml(issue.date || '정보 부족')}</span>
      </div>
      <h1 class="title">${escapeHtml(issue.title)}</h1>
      <p class="summary">${escapeHtml(issue.summaryCard)}</p>
    </div>
    ${easySummary ? `<div class="section">
      <h2 class="section-title">쉬운 요약</h2>
      <p>${escapeHtml(easySummary)}</p>
    </div>` : ''}
    <div class="section">
      <h2 class="section-title">무슨 일이 있었나요?</h2>
      ${backgroundParagraphs.map(p => `<p style="margin: 0.75rem 0;">${escapeHtml(p)}</p>`).join('')}
    </div>
    <div class="section">
      <h2 class="section-title">핵심 쟁점 정리</h2>
      <ul>${keyPoints.map(p => `<li>${escapeHtml(p)}</li>`).join('')}</ul>
    </div>
    ${progressiveView ? `<div class="section progressive">
      <h2 class="section-title">진보 성향에서 보는 전망</h2>
      <h3 style="font-size: 1.125rem; margin-bottom: 0.5rem;">${escapeHtml(progressiveView.headline)}</h3>
      <ul>${progressiveView.bullets.map(b => `<li>${escapeHtml(b)}</li>`).join('')}</ul>
    </div>` : ''}
    ${conservativeView ? `<div class="section conservative">
      <h2 class="section-title">보수 성향에서 보는 전망</h2>
      <h3 style="font-size: 1.125rem; margin-bottom: 0.5rem;">${escapeHtml(conservativeView.headline)}</h3>
      <ul>${conservativeView.bullets.map(b => `<li>${escapeHtml(b)}</li>`).join('')}</ul>
    </div>` : ''}
    ${impactToLife ? `<div class="section">
      <h2 class="section-title">생활에 어떤 영향이 있나요?</h2>
      <p>${escapeHtml(impactToLife.text)}</p>
    </div>` : ''}
    ${themeSpecificContent}
    <div class="section">
      <h2 class="section-title">근거 자료</h2>
      ${Array.isArray(issue.sources) && issue.sources.length > 0 ? issue.sources.map(s => `
        <div class="source-item">
          <strong>${escapeHtml(s.channelName || '출처 미상')}</strong>
          <p style="font-size: 0.875rem; color: #64748b; margin-top: 0.25rem;">${escapeHtml(s.sourceDate || '')}</p>
          <p style="margin-top: 0.5rem;">${escapeHtml(s.note || '')}</p>
        </div>
      `).join('') : '<p>등록된 출처가 없습니다.</p>'}
    </div>
  </div>
</body>
</html>`;
    return html;
  };

  const handleDownloadHTML = () => {
    const html = generateHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${issue.title.replace(/[^a-zA-Z0-9가-힣]/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setToastMessage('HTML 파일이 다운로드되었습니다.');
  };

  const handleCopyHTML = async () => {
    const html = generateHTML();
    try {
      await navigator.clipboard.writeText(html);
      setToastMessage('HTML이 복사되었습니다.');
    } catch (err) {
      console.error('HTML 복사 실패:', err);
      setToastMessage('복사에 실패했습니다.');
    }
  };

  const handleCopyLink = async () => {
    if (typeof navigator === 'undefined') {
      return;
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      setToastMessage('링크가 복사되었습니다.');
    } catch (err) {
      console.error('링크 복사 실패:', err);
      setToastMessage('복사에 실패했습니다. 주소 표시줄에서 직접 복사해주세요.');
    }
  };

  const formatCommentTimestamp = useCallback((value) => {
    if (!value) return '';
    try {
      const date = typeof value.toDate === 'function' ? value.toDate() : value instanceof Date ? value : new Date(value);
      return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
    } catch (err) {
      console.error('댓글 시간 포맷 실패:', err);
      return '';
    }
  }, []);

  const handleShareToggle = () => {
    setShareOpen((prev) => !prev);
  };

  const handleVote = async (type) => {
    if (!issue?.id) {
      return;
    }

    const execute = async () => {
      try {
        const result = await submitIssueVote(issue.id, {
          type,
          userId: user?.uid,
          isAdmin
        });
        const nextStats = result?.stats ?? INITIAL_STATS;
        setIssueStats(nextStats);
        setIssue((prev) => (prev ? { ...prev, stats: nextStats } : prev));
        if (result?.userState) {
          setUserInteraction((prev) => ({
            ...prev,
            ...result.userState
          }));
        }
        setToastMessage(type === 'up' ? '추천했습니다.' : '비추천했습니다.');
      } catch (err) {
        console.error('투표 처리 실패:', err);
        setToastMessage(err?.message || '처리 중 문제가 발생했습니다.');
      }
    };

    if (!user) {
      requireAuth(execute, { message: '로그인 후 추천/비추천을 이용할 수 있습니다.' });
      return;
    }

    execute();
  };

  const handleToggleScrap = async () => {
    if (!issue?.id) {
      return;
    }

    const execute = async () => {
      try {
        const result = await toggleIssueScrap(issue.id, { userId: user.uid });
        const nextStats = result?.stats ?? INITIAL_STATS;
        setIssueStats(nextStats);
        setIssue((prev) => (prev ? { ...prev, stats: nextStats } : prev));
        setUserInteraction((prev) => ({ ...prev, hasScrapped: Boolean(result?.scrapped) }));
        setToastMessage(result?.scrapped ? '스크랩에 추가했습니다.' : '스크랩을 해제했습니다.');
      } catch (err) {
        console.error('스크랩 처리 실패:', err);
        setToastMessage(err?.message || '스크랩 처리 중 문제가 발생했습니다.');
      }
    };

    if (!user) {
      requireAuth(execute, { message: '로그인 후 스크랩 기능을 이용할 수 있습니다.' });
      return;
    }

    execute();
  };

  const handleSubmitComment = async (event) => {
    event.preventDefault();
    if (!issue?.id) {
      return;
    }
    const trimmed = commentInput.trim();
    if (!trimmed) {
      setCommentFeedback('댓글 내용을 입력해주세요.');
      return;
    }

    const execute = async () => {
      setCommentSubmitting(true);
      setCommentFeedback('');
      try {
        const result = await addIssueComment(issue.id, {
          userId: user.uid,
          displayName: user.displayName?.trim() || user.email || '회원',
          email: user.email || '',
          content: trimmed
        });
        if (result?.comment) {
          setComments((prev) => {
            const next = [...prev, result.comment];
            return next.sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt));
          });
        }
        if (result?.stats) {
          setIssueStats(result.stats);
          setIssue((prev) => (prev ? { ...prev, stats: result.stats } : prev));
        }
        setCommentInput('');
        setToastMessage('댓글이 등록되었습니다.');
      } catch (err) {
        console.error('댓글 작성 실패:', err);
        setCommentFeedback(err?.message || '댓글 작성에 실패했습니다. 잠시 후 다시 시도해주세요.');
      } finally {
        setCommentSubmitting(false);
      }
    };

    if (!user) {
      requireAuth(execute, { message: '댓글 작성은 로그인 후 이용할 수 있습니다.' });
      return;
    }

    execute();
  };

  const handleReport = () => {
    if (!issue) {
      return;
    }
    const subject = encodeURIComponent(`[신고] ${issue.title || '게시물'}`);
    const body = encodeURIComponent(`문제가 발생한 내용을 자세히 적어주세요.\n\n게시물 링크: ${window.location.href}`);
    window.location.href = `mailto:report@infoall.kr?subject=${subject}&body=${body}`;
  };

  return (
    <section className="space-y-8">
      <MetaTags title={metaTitle} description={metaDescription} url={pageUrl} />

      {toastMessage && (
        <div className="fixed inset-x-0 top-20 z-50 mx-auto w-full max-w-sm rounded-lg border border-indigo-200 bg-white px-4 py-3 text-center text-sm text-indigo-700 shadow-lg dark:border-indigo-500/40 dark:bg-slate-900 dark:text-indigo-200">
          {toastMessage}
        </div>
      )}

      {isLoading && <p className="text-sm text-slate-500 dark:text-slate-300">데이터를 불러오는 중입니다...</p>}

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100">
          {error}
        </p>
      )}

      {!isLoading && !error && issue && (
        <div className="space-y-6">
          <header className="rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-300">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-slate-900/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700 dark:bg-slate-100/10 dark:text-slate-200">
                  {themeLabel}
                </span>
                <span className="font-semibold uppercase tracking-wide">{issue.date || '정보 부족'}</span>
              </div>
              {(issue.category || issue.subcategory) && (
                <div className="flex flex-wrap items-center gap-1">
                  {issue.category ? (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:ring-slate-500">
                      {issue.category}
                    </span>
                  ) : null}
                  {issue.subcategory ? (
                    <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 font-semibold text-indigo-600 ring-1 ring-inset ring-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-200 dark:ring-indigo-400/50">
                      {issue.subcategory}
                    </span>
                  ) : null}
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold leading-snug text-slate-900 dark:text-slate-100">{issue.title}</h1>
              <span className="rounded-md bg-rose-500/10 px-2 py-1 text-sm font-semibold text-rose-600 dark:bg-rose-500/20 dark:text-rose-200">
                [{issueStats.commentCount ?? comments.length}]
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{issue.summaryCard}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 shadow-sm transition hover:border-indigo-400 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-400/60 dark:hover:text-indigo-300 dark:focus-visible:ring-offset-slate-900"
              >
                링크 복사
              </button>
              <button
                type="button"
                onClick={handleDownloadHTML}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 shadow-sm transition hover:border-indigo-400 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-400/60 dark:hover:text-indigo-300 dark:focus-visible:ring-offset-slate-900"
              >
                HTML 다운로드
              </button>
              <button
                type="button"
                onClick={handleCopyHTML}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 shadow-sm transition hover:border-indigo-400 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-400/60 dark:hover:text-indigo-300 dark:focus-visible:ring-offset-slate-900"
              >
                HTML 복사
              </button>
            </div>
          </header>

          {easySummary && (
            <SectionCard title="쉬운 요약" tone="neutral">
              <p className="text-base leading-relaxed text-slate-700 dark:text-slate-200">{easySummary}</p>
            </SectionCard>
          )}

          <SectionCard title="무슨 일이 있었나요?" tone="neutral">
            {backgroundParagraphs.length > 0 ? (
              <div className="space-y-3">
                {backgroundParagraphs.map((paragraph, index) => (
                  <p key={index} className="leading-relaxed text-slate-700 dark:text-slate-200">
                    {paragraph}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">배경 설명이 아직 입력되지 않았습니다.</p>
            )}
          </SectionCard>

          <SectionCard title="핵심 쟁점 정리" tone="neutral">
            {keyPoints.length > 0 ? (
              <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                {keyPoints.map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">핵심 쟁점 항목이 아직 없습니다.</p>
            )}
          </SectionCard>

          {progressiveView && (
            <SectionCard title="진보 성향에서 보는 전망" tone="progressive" badgeText="진보 시각">
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-emerald-800 dark:text-emerald-200">{progressiveView.headline}</h3>
                  <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">{progressiveView.note}</p>
                </div>
                {progressiveView.bullets.length > 0 ? (
                  <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-emerald-900 dark:text-emerald-100">
                    {progressiveView.bullets.map((bullet, index) => (
                      <li key={index}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
                {typeof progressiveView.intensity === 'number' && progressiveView.intensity >= 0 ? (
                  <IntensityBar intensity={progressiveView.intensity} />
                ) : (
                  <p className="text-xs text-emerald-800/70 dark:text-emerald-200/80">강도 정보가 제공되지 않았습니다.</p>
                )}
              </div>
            </SectionCard>
          )}

          {conservativeView && (
            <SectionCard title="보수 성향에서 보는 전망" tone="conservative" badgeText="보수 시각">
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-rose-900 dark:text-rose-100">{conservativeView.headline}</h3>
                  <p className="text-xs text-rose-700/80 dark:text-rose-200/80">{conservativeView.note}</p>
                </div>
                {conservativeView.bullets.length > 0 ? (
                  <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-rose-900 dark:text-rose-100">
                    {conservativeView.bullets.map((bullet, index) => (
                      <li key={index}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
                {typeof conservativeView.intensity === 'number' && conservativeView.intensity >= 0 ? (
                  <IntensityBar intensity={conservativeView.intensity} />
                ) : (
                  <p className="text-xs text-rose-700/70 dark:text-rose-200/80">강도 정보가 제공되지 않았습니다.</p>
                )}
              </div>
            </SectionCard>
          )}

          {impactToLife && (
            <SectionCard title="생활에 어떤 영향이 있나요?" tone="impact" badgeText="체감 영향">
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200">{impactToLife.text}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{impactToLife.note || IMPACT_NOTE}</p>
            </SectionCard>
          )}

          {issue.theme === 'parenting' && parentingGuide ? (
            <ParentingGuideView guide={parentingGuide} />
          ) : null}

          {issue.theme === 'lifestyle' && lifestyleGuide ? (
            <LifestyleGuideView guide={lifestyleGuide} />
          ) : null}

          {issue.theme === 'health' && healthGuide ? (
            <HealthGuideView guide={healthGuide} />
          ) : null}

          {issue.theme === 'stocks' && stockGuide ? (
            <StockGuideView guide={stockGuide} />
          ) : null}
          
          {issue.theme === 'support' && supportGuide ? (
            <SupportGuideView guide={supportGuide} />
          ) : null}

          <SectionCard title="근거 자료" tone="neutral">
            {Array.isArray(issue.sources) && issue.sources.length > 0 ? (
              <ul className="space-y-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                {issue.sources.map((source, index) => (
                  <li key={`${source.channelName}-${index}`} className="rounded-lg border border-slate-200 bg-white/60 p-4 dark:border-slate-600 dark:bg-slate-900/40">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{source.channelName || '출처 미상'}</p>
                    <p className="mt-1 text-xs uppercase tracking-wider text-indigo-500 dark:text-indigo-300">{source.type || 'etc'}</p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      날짜: {source.sourceDate || '정보 부족'} {source.timestamp ? `· ${source.timestamp}` : ''}
                    </p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{source.note || '설명이 없습니다.'}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">등록된 출처가 없습니다.</p>
            )}
          </SectionCard>

          {shouldShowGroupbuyLink ? (
            <SectionCard title="관련 링크" tone="neutral">
              <a
                href={groupbuyLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-rose-600 underline decoration-rose-400 decoration-2 underline-offset-4 transition hover:text-rose-700 dark:text-rose-300 dark:hover:text-rose-200"
              >
                {groupbuyLink}
              </a>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">위 링크에서 공동구매 참여 가능합니다!</p>
            </SectionCard>
          ) : null}

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">댓글</h2>
              <span className="text-sm font-semibold text-rose-600 dark:text-rose-300">
                총 {issueStats.commentCount ?? comments.length}개
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">로그인한 회원만 댓글을 작성할 수 있습니다.</p>
            <div className="space-y-3">
              {commentsLoading ? (
                <p className="rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-200">
                  댓글을 불러오는 중입니다…
                </p>
              ) : comments.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-300">
                  아직 댓글이 없습니다. 첫 번째 댓글을 남겨보세요!
                </p>
              ) : (
                <ul className="space-y-3">
                  {comments.map((comment) => (
                    <li key={comment.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-600 dark:bg-slate-900/40">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                          {comment.displayName || comment.email || '회원'}
                        </span>
                        <span>{formatCommentTimestamp(comment.createdAt)}</span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                        {comment.content}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <form onSubmit={handleSubmitComment} className="space-y-2">
              <textarea
                value={commentInput}
                onChange={(event) => setCommentInput(event.target.value)}
                disabled={!user || commentSubmitting}
                placeholder={user ? '댓글을 입력해주세요.' : '로그인 후 댓글을 작성할 수 있습니다.'}
                className="min-h-[100px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:disabled:bg-slate-800"
              />
              {commentFeedback ? (
                <p className="text-xs text-rose-600 dark:text-rose-300">{commentFeedback}</p>
              ) : null}
              <div className="flex items-center justify-end gap-2">
                {!user ? (
                  <button
                    type="button"
                    onClick={() => requireAuth(() => {}, { message: '로그인 후 댓글을 작성할 수 있습니다.' })}
                    className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-600 dark:text-slate-300 dark:hover:border-indigo-400 dark:hover:text-indigo-200 dark:focus-visible:ring-offset-slate-900"
                  >
                    로그인하기
                  </button>
                ) : null}
                <button
                  type="submit"
                  disabled={!user || commentSubmitting}
                  className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:hover:bg-indigo-500/80 dark:focus-visible:ring-offset-slate-900"
                >
                  댓글 등록
                </button>
              </div>
            </form>
          </section>

          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-rose-600 dark:text-rose-300">{issueStats.upVotes ?? 0}</span>
                <button
                  type="button"
                  onClick={() => handleVote('up')}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 ${
                    userInteraction.hasUpvoted
                      ? 'bg-rose-500 text-white hover:bg-rose-600'
                      : 'border border-slate-300 bg-white text-slate-700 hover:border-rose-300 hover:text-rose-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-rose-400 dark:hover:text-rose-200'
                  }`}
                >
                  ⭐ 추천
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleVote('down')}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 ${
                    userInteraction.hasDownvoted
                      ? 'bg-slate-800 text-white hover:bg-slate-900'
                      : 'border border-slate-300 bg-white text-slate-700 hover:border-slate-500 hover:text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-400'
                  }`}
                >
                  📉 비추천
                </button>
                <span className="text-lg font-bold text-slate-900 dark:text-slate-200">{issueStats.downVotes ?? 0}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <button
                type="button"
                onClick={handleShareToggle}
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 transition hover:border-indigo-400 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-600 dark:bg-slate-900 dark:hover:border-indigo-400 dark:hover:text-indigo-200 dark:focus-visible:ring-offset-slate-900"
              >
                공유
              </button>
              <button
                type="button"
                onClick={handleToggleScrap}
                className={`rounded-full px-3 py-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 ${
                  userInteraction.hasScrapped
                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                    : 'border border-slate-300 bg-white text-slate-700 hover:border-amber-300 hover:text-amber-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-amber-400 dark:hover:text-amber-200'
                }`}
              >
                {userInteraction.hasScrapped ? '스크랩됨' : '스크랩'}
              </button>
              <button
                type="button"
                onClick={handleReport}
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 transition hover:border-rose-300 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-rose-400 dark:hover:text-rose-200 dark:focus-visible:ring-offset-slate-900"
              >
                신고
              </button>
            </div>
            {isShareOpen ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm dark:border-slate-600 dark:bg-slate-900/40">
                <p className="mb-2 font-semibold text-slate-800 dark:text-slate-100">공유 링크</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={pageUrl}
                    readOnly
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:hover:bg-indigo-500/80 dark:focus-visible:ring-offset-slate-900"
                  >
                    복사
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">버튼을 눌러 링크를 복사한 뒤 원하는 곳에 붙여넣으세요.</p>
              </div>
            ) : null}
          </section>
        </div>
      )}
    </section>
  );
}

export default IssuePage;
