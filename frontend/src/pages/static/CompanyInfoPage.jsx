import StaticContentPage from './StaticContentPage.jsx';

export default function CompanyInfoPage() {
  return (
    <StaticContentPage
      slug="company-overview"
      defaultTitle="회사소개"
      defaultDescription="회사 연혁, 비전, 핵심 가치 등을 이 영역에 자유롭게 채워주세요."
    />
  );
}
