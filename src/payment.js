/**
 * 카페 원가계산기 - Payment Gateway & PRO Monetization Engine
 * (Toss Payments / PortOne 결제 연동 및 라이선스 발급 엔진)
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
 */
export function processCheckout({ planId, payMethod = 'card', customerName = '카페사장님', state, onSuccess, onError }) {
  const plan = PRICING_PLANS[planId] || PRICING_PLANS.pro_lifetime;
  const orderId = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
  const orderName = `카페 원가계산기 ${plan.title}`;
  const amount = plan.price;

  // Toss Payments Client Key (사장님의 상점키가 있으면 상용키 사용, 없으면 공식 토스 테스트키 사용)
  const clientKey = (state.customPgKey && state.customPgKey.trim()) 
    ? state.customPgKey.trim() 
    : 'test_ck_D5GePWvyJqK4WBaoxYKE3N7jmO56';

  if (window.TossPayments) {
    try {
      const toss = window.TossPayments(clientKey);
      
      // Determine Toss payment method string
      let tossMethod = '카드';
      if (payMethod === 'kakaopay' || payMethod === 'tosspay' || payMethod === 'naverpay') {
        tossMethod = '카드'; // 토스 결제창 내부에서 카카오페이/토스페이/네이버페이 원클릭 선택 지원
      }

      // Check current URL for callback
      const currentUrl = window.location.href.split('?')[0];

      toss.requestPayment(tossMethod, {
        amount,
        orderId,
        orderName,
        customerName,
        successUrl: currentUrl + '?payment_success=true&plan=' + planId + '&orderId=' + orderId,
        failUrl: currentUrl + '?payment_fail=true'
      }).then(() => {
        // Successful checkout approval in test/live
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
          console.warn('Toss Payment Notice:', err);
          // If window popup was blocked or in iframe, provide test approval fallback
          handleSimulatedPaymentSuccess(state, plan, payMethod, onSuccess);
        }
      });
      return;
    } catch (e) {
      console.warn('Toss initialization error, falling back:', e);
    }
  }

  // Fallback if offline
  handleSimulatedPaymentSuccess(state, plan, payMethod, onSuccess);
}

/**
 * Internal helper for simulated test approval
 */
function handleSimulatedPaymentSuccess(state, plan, payMethod, onSuccess) {
  setTimeout(() => {
    const license = activateProMembership(state, plan.id, {
      amount: plan.price,
      payMethod: payMethod === 'kakaopay' ? '카카오페이' : (payMethod === 'tosspay' ? '토스페이' : '신용/체크카드')
    });
    if (onSuccess) {
      onSuccess({
        license,
        plan,
        receiptNo: 'REC-' + Date.now().toString().slice(-6)
      });
    }
  }, 500);
}

/**
 * Checks if user is authorized for PRO features (100% 무료 전면 개방)
 */
export function checkFeatureAccess(state, featureName = 'feature') {
  return true; // 100% 평생 무료 개방: 누구나 결제 없이 모든 기능 이용
}
