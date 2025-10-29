// frontend/tailwind.config.js
// darkMode를 class 전략으로 유지한다. Firestore 직행 구조 변경과는 무관하지만 UI 다크 모드 동작을 위해 필요하다.

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {}
  },
  plugins: []
};
