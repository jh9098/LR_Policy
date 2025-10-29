// frontend/tailwind.config.js
// 다크 모드는 class 기반으로 유지한다. Firestore 직행 구조와는 무관하지만 UI 일관성을 위해 그대로 둔다.

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
