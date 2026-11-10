/**
 * 카페 원가계산기 - Payment Gateway & PRO Monetization Engine
 * (Toss Payments 결제 연동 및 라이선스 발급 엔진)
 */

import { activateProMembership } from './storage.js';

export const PRICING_PLANS = {
  pro_lifetime: {
    id: 'pro_lifetime',
    title: 'PRO 평생 소장권 (얼리버드 70% 할인)',
    price: 29900,
    originalPrice: 99000,
    billingType: '1회 결제로 평생 무제한 이용',
    popular: true,
    badge: '🔥 가장 인기 (한정 특가)',
    features: [
      '📊 엑셀(CSV) 원가표 무제한 다운로드',
      '📄 인쇄용 A4 PDF 공식 원가 보고서 출력',
      '🎯 손익분기점(BEP) 월·일 판매잔수 자동 진단',
      '🛵 배달의민족·쿠팡이츠 배달 수수료 마진 정밀 비교',
      '📁 카페 전 메뉴 레시피 무제한 저장 & 비교',
      '💎 PRO 사장님 전용 프리미엄 배지 및 평생 업데이트'
    ]
  },
  pro_monthly: {
    id: 'pro_monthly',
    title: 'PRO 월간 정기구독',
    price: 9900,
    originalPrice: 19900,
    billingType: '월 9,900원 (하루 330원)',
    popular: false,
    badge: '월간 결제',
    features: [
      '📊 엑셀(CSV) 원가표 다운로드',
      '📄 A4 PDF 원가 보고서 인쇄',
      '🎯 손익분기점(BEP) 계산기',
      '🛵 배달앱 수수료 마진 시뮬레이션',
      '📁 메뉴 무제한 저장',
      '언제든 1클릭 구독 해지 가능'
    ]
  }
};

/**
 * Initializes PortOne / Toss Payments SDKs dynamically
 */
export function initPaymentSDKs() {
  if (!window.TossPayments) {
    const tossScript = document.createElement('script');
    tossScript.src = 'https://js.tosspayments.com/v1/payment';
    tossScript.async = true;
    document.head.appendChild(tossScript);
  }
}

/**
 * Executes Payment Flow (Toss Payments Interactive Checkout)
 * ※ 절대로 가짜 무료 승인을 하지 않으며, 실제 결제가 완료되었을 때만 PRO가 활성화됩니다.
 */
export function processCheckout({ planId, payMethod = 'card', customerName = '카페사장님', state, onSuccess, onError }) {
  const plan = PRICING_PLANS[planId] || PRICING_PLANS.pro_lifetime;
  const orderId = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
  const orderName = `카페 원가계산기 ${plan.title}`;
  const amount = plan.price;

  // Toss Payments Client Key (사장님이 설정에서 등록한 실제 토스 상점키)
  const clientKey = (state.customPgKey && state.customPgKey.trim()) ? state.customPgKey.trim() : '';

  if (clientKey && window.TossPayments) {
    try {
      const toss = window.TossPayments(clientKey);
      let tossMethod = '카드';
      const currentUrl = window.location.href.split('?')[0];

      toss.requestPayment(tossMethod, {
        amount,
        orderId,
        orderName,
        customerName,
        successUrl: currentUrl + '?payment_success=true&plan=' + planId + '&orderId=' + orderId,
        failUrl: currentUrl + '?payment_fail=true'
      }).then(() => {
        // 실제 결제창 팝업 승인 완료 시에만 발급
        const license = activateProMembership(state, planId, {
          amount,
          payMethod: payMethod === 'kakaopay' ? '카카오페이' : (payMethod === 'tosspay' ? '토스페이' : '신용/체크카드'),
          receiptNo: orderId
        });
        if (onSuccess) onSuccess({ license, plan, receiptNo: orderId });
      }).catch(err => {
        if (err.code === 'USER_CANCEL') {
          if (onError) onError(new Error('결제를 취소하셨습니다.'));
        } else {
          console.warn('Toss Payment Error:', err);
          if (onError) onError(new Error(err.message || '카드 결제 처리 중 오류가 발생했습니다.'));
        }
      });
      return;
    } catch (e) {
      console.warn('Toss initialization error:', e);
      if (onError) onError(new Error('토스페이먼츠 연동 오류: ' + e.message));
      return;
    }
  }

  // 상점키가 아직 미등록된 경우: 가짜 무료 승인을 하지 않고 PG_NOT_CONFIGURED 에러를 전달
  if (onError) {
    onError(new Error('PG_NOT_CONFIGURED'));
  }
}

/**
 * Checks if user is authorized for PRO features
 */
export function checkFeatureAccess(state, featureName = 'feature') {
  if (state.isPro) return true;
  return false;
}
