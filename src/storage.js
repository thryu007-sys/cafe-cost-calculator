/**
 * 카페 원가계산기 - LocalStorage Storage, Preset Data & PRO Monetization Manager
 */

const LOCAL_STORAGE_KEY = 'cafe_cost_calculator_v3_state';

// 1. Clean Initial State (Coffee702 Real Operation Audit Values)
export const DEFAULT_CLEAN_STATE = {
  menuName: '',
  temp: 'HOT',             // 'HOT' | 'ICE'
  serviceType: 'STORE',     // 'STORE' | 'TAKEOUT'
  
  packPrices: {
    cup: 48900,   // 48,900원 / 1,000개 = 48.9원
    lid: 5000,    // 5,000원 / 100개 = 50원
    sleeve: 3000,  // 3,000원 / 100개 = 30원
    straw: 2000,   // 2,000원 / 100개 = 20원
    carrier: 5000  // 5,000원 / 100개 = 50원
  },
  packQtys: {
    cup: 1000,
    lid: 100,
    sleeve: 100,
    straw: 100,
    carrier: 100
  },

  ingredients: [],

  cardFeeRate: 1.5,
  deliveryFeeRate: 0.0,
  extraVariableCost: 0,

  monthlyVolume: 0, // 선택적: 0이면 미배분 (1잔 직접원가 기준)

  fixedItems: {
    rent: 700000,
    utilities: 70000,
    services: 50000,
    otherFixed: 0
  },
  laborItems: {
    salaries: 4000000,
    insurance: 0,
    otherLabor: 0
  },

  sellingPrice: 4500,

  savedMenus: [],

  // 💎 100% 평생 무료 버전 (모든 PRO 기능 기본 잠금 해제)
  isPro: true,
  proPlan: 'free_lifetime_unlocked',
  proActivatedAt: '2026-10-30T00:00:00.000Z',
  licenseKey: 'FREE-LIFETIME-VIP',
  paymentHistory: [],
  customPgKey: ''           // 사장님이 실제 Toss/PortOne 키 등록 시 사용
};

// 2. Standard Test State (아메리카노 표준 테스트 데이터)
export const STANDARD_TEST_STATE = {
  menuName: '아메리카노',
  temp: 'HOT',
  serviceType: 'STORE',

  packPrices: {
    cup: 48900,
    lid: 5000,
    sleeve: 3000,
    straw: 2000,
    carrier: 5000
  },
  packQtys: {
    cup: 1000,
    lid: 100,
    sleeve: 100,
    straw: 100,
    carrier: 100
  },

  ingredients: [
    {
      id: 'ing-default-1',
      name: '원두',
      price: 30000,
      qty: 1000,
      unit: 'g',
      usage: 18,
      usageUnit: 'g'
    }
  ],

  cardFeeRate: 1.5,
  deliveryFeeRate: 0.0,
  extraVariableCost: 0,

  monthlyVolume: 0,

  fixedItems: {
    rent: 700000,
    utilities: 70000,
    services: 50000,
    otherFixed: 0
  },
  laborItems: {
    salaries: 4000000,
    insurance: 0,
    otherLabor: 0
  },

  sellingPrice: 4500,

  savedMenus: [],

  // 100% 평생 무료 버전 (모든 PRO 기능 기본 잠금 해제)
  isPro: true,
  proPlan: 'free_lifetime_unlocked',
  proActivatedAt: '2026-10-30T00:00:00.000Z',
  licenseKey: 'FREE-LIFETIME-VIP',
  paymentHistory: [],
  customPgKey: ''
};

/**
 * Loads state from LocalStorage or returns default clean state
 */
export function loadSavedState() {
  try {
    const json = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!json) return JSON.parse(JSON.stringify(DEFAULT_CLEAN_STATE));
    const parsed = JSON.parse(json);
    if (parsed.serviceType === 'DINE_IN') parsed.serviceType = 'STORE';

    // Normalize packaging defaults
    if (!parsed.packPrices) parsed.packPrices = { ...DEFAULT_CLEAN_STATE.packPrices };
    if (!parsed.packQtys) parsed.packQtys = { ...DEFAULT_CLEAN_STATE.packQtys };

    parsed.packPrices.cup = 48900;
    parsed.packQtys.cup = 1000;
    parsed.packPrices.lid = 5000;
    parsed.packQtys.lid = 100;
    parsed.packPrices.sleeve = 3000;
    parsed.packQtys.sleeve = 100;
    parsed.packPrices.straw = 2000;
    parsed.packQtys.straw = 100;
    parsed.packPrices.carrier = 5000;
    parsed.packQtys.carrier = 100;

    // Auto-migrate legacy overhead defaults
    if (!parsed.fixedItems || parsed.fixedItems.rent === 2000000) {
      parsed.fixedItems = { ...DEFAULT_CLEAN_STATE.fixedItems };
    }
    if (!parsed.laborItems || parsed.laborItems.salaries === 1200000) {
      parsed.laborItems = { ...DEFAULT_CLEAN_STATE.laborItems };
    }

    if (parsed.monthlyVolume === undefined || parsed.monthlyVolume === null) {
      parsed.monthlyVolume = 0;
    }

    // 100% 무료 평생 버전: 모든 사용자에게 모든 PRO 기능 강제 개방
    parsed.isPro = true;
    parsed.proPlan = 'free_lifetime_unlocked';
    if (!parsed.licenseKey) parsed.licenseKey = 'FREE-LIFETIME-VIP';
    if (!Array.isArray(parsed.paymentHistory)) parsed.paymentHistory = [];

    return { ...DEFAULT_CLEAN_STATE, ...parsed };
  } catch (e) {
    console.error('Failed to load state from LocalStorage:', e);
    return JSON.parse(JSON.stringify(DEFAULT_CLEAN_STATE));
  }
}

/**
 * Saves current state to LocalStorage
 */
export function saveStateToStorage(state) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state to LocalStorage:', e);
  }
}

/**
 * Activates PRO membership and issues a license key
 */
export function activateProMembership(state, plan = 'pro_lifetime', paymentDetails = {}) {
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Date.now().toString().slice(-4);
  const license = `CAFE-PRO-${randomSuffix}`;

  state.isPro = true;
  state.proPlan = plan;
  state.proActivatedAt = new Date().toISOString();
  state.licenseKey = license;

  if (!state.paymentHistory) state.paymentHistory = [];
  state.paymentHistory.unshift({
    id: 'pay-' + Date.now(),
    orderName: plan === 'pro_lifetime' ? 'PRO 평생 이용권 (얼리버드)' : 'PRO 월간 정기구독',
    amount: paymentDetails.amount || (plan === 'pro_lifetime' ? 29900 : 9900),
    payMethod: paymentDetails.payMethod || '간편결제/신용카드',
    paidAt: new Date().toLocaleDateString('ko-KR') + ' ' + new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    licenseKey: license,
    receiptNo: 'REC-' + Math.floor(100000 + Math.random() * 900000)
  });

  saveStateToStorage(state);
  return license;
}

/**
 * Restores or activates PRO with a license key
 */
export function restoreProWithLicenseKey(state, inputKey) {
  if (!inputKey || typeof inputKey !== 'string') return false;
  const cleanKey = inputKey.trim().toUpperCase();

  // Valid format: CAFE-PRO-XXXX-XXXX or VIP-XXXX
  if (cleanKey.startsWith('CAFE-PRO-') || cleanKey.startsWith('VIP-') || cleanKey === 'CAFE702-VIP') {
    state.isPro = true;
    state.proPlan = 'pro_lifetime';
    state.proActivatedAt = new Date().toISOString();
    state.licenseKey = cleanKey;
    saveStateToStorage(state);
    return true;
  }
  return false;
}

/**
 * Exports current state as a downloadable JSON file
 */
export function exportStateAsJSON(state) {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `cafe_cost_backup_${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Parses and imports JSON backup file
 */
export function importStateFromJSON(fileContent) {
  try {
    const parsed = JSON.parse(fileContent);
    if (typeof parsed === 'object' && parsed !== null) {
      if (parsed.serviceType === 'DINE_IN') parsed.serviceType = 'STORE';
      return { ...DEFAULT_CLEAN_STATE, ...parsed };
    }
    throw new Error('Invalid JSON format');
  } catch (e) {
    throw e;
  }
}
