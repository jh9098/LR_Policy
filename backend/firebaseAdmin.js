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
