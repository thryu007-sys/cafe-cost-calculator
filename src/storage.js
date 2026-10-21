/**
 * 카페 원가계산기 - LocalStorage Storage & Preset Data Manager
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

  savedMenus: []
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

  savedMenus: []
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

    // Auto-migrate legacy 3,000,000 / 1,500,000 overhead defaults if found
    if (!parsed.fixedItems || parsed.fixedItems.rent === 2000000) {
      parsed.fixedItems = { ...DEFAULT_CLEAN_STATE.fixedItems };
    }
    if (!parsed.laborItems || parsed.laborItems.salaries === 1200000) {
      parsed.laborItems = { ...DEFAULT_CLEAN_STATE.laborItems };
    }

    if (parsed.monthlyVolume === undefined || parsed.monthlyVolume === null) {
      parsed.monthlyVolume = 0;
    }

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
