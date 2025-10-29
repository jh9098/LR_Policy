/*
  현재 프론트엔드는 Firestore Web SDK를 통해 직접
  issues 문서에 대해 create / update / delete 까지 수행한다.
  즉 이 Express 서버(Render)는 런타임에서 더 이상 사용되지 않고 있다.
  이 서버 코드는 향후 "보안 강화/권한 제어"를 위해 남겨둔 레거시 초안일 뿐이다.
  TODO(프로덕션): /admin 접근 제한 + Firestore 보안 규칙 잠그기 + 이 서버에서만 쓰기 허용하는 구조로 전환해야 한다.
*/

const admin = require('firebase-admin');

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccountJson) {
  throw new Error(
    'FIREBASE_SERVICE_ACCOUNT 환경변수가 설정되지 않았습니다. Render 대시보드 또는 .env 파일에 서비스 계정 JSON 문자열을 추가하세요.'
  );
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountJson);
} catch (error) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT 환경변수가 올바른 JSON 문자열인지 확인하세요.');
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const { FieldValue } = admin.firestore;

module.exports = {
  admin,
  db,
  FieldValue
};
