/**
 * 카페 원가계산기 - Core Calculation Engine
 * (1잔 직접원가 + 선택적 고정비·인건비 배분 정밀 연산 엔진)
 */

// Packaging Auto-Apply Rules Definition
export const PACKAGING_RULES = {
  'HOT_STORE': {
    label: '매장 + HOT',
    items: [],
    itemLabels: {}
  },
  'ICE_STORE': {
    label: '매장 + ICE',
    items: ['straw'],
    itemLabels: { straw: '빨대' }
  },
  'HOT_TAKEOUT': {
    label: '테이크아웃 + HOT',
    items: ['cup', 'lid', 'sleeve', 'carrier'],
    itemLabels: { cup: '컵', lid: '뚜껑', sleeve: '컵홀더', carrier: '캐리어' }
  },
  'ICE_TAKEOUT': {
    label: '테이크아웃 + ICE',
    items: ['cup', 'lid', 'sleeve', 'straw', 'carrier'],
    itemLabels: { cup: '컵', lid: '뚜껑', sleeve: '컵홀더', straw: '빨대', carrier: '캐리어' }
  }
};

/**
 * Robust number parser stripping all non-numeric characters except digits, minus, and decimal point.
 * Example: "48,900원" -> 48900, "1,000개" -> 1000
 */
export function parseNumber(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim();
  if (!str) return 0;
  const cleanStr = str.replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleanStr);
  return isNaN(num) ? 0 : num;
}

/**
 * Formats a number with thousands separators (콤마).
 * Example: 30000 -> "30,000"
 */
export function formatCommaNumber(val) {
  if (val === '' || val === null || val === undefined) return '';
  const num = parseNumber(val);
  return num.toLocaleString('ko-KR');
}

/**
 * Calculates per-item packaging unit price (unrounded float)
 * 구입가격 ÷ 구입수량 = 1개당 가격
 */
export function calculatePackagingUnitCost(price, qty) {
  const p = parseNumber(price);
  const q = parseNumber(qty);
  return q > 0 ? p / q : 0;
}

/**
 * Determines applied packaging items and calculates total packaging cost per cup
 */
export function calculatePackagingTotal(temp, serviceType, packPrices = {}, packQtys = {}) {
  const ruleKey = `${temp}_${serviceType}`;
  const rule = PACKAGING_RULES[ruleKey] || PACKAGING_RULES['HOT_STORE'];
  
  let appliedTotal = 0; // Full precision float sum
  const appliedItemsList = [];

  const allKeys = ['cup', 'lid', 'sleeve', 'straw', 'carrier'];
  const allLabels = { cup: '컵', lid: '뚜껑', sleeve: '컵홀더', straw: '빨대', carrier: '캐리어' };

  allKeys.forEach(key => {
    const isApplied = rule.items.includes(key);
    const price = parseNumber(packPrices[key]);
    const qty = parseNumber(packQtys[key]);
    const unitCost = calculatePackagingUnitCost(price, qty); // exact unrounded float (e.g. 48.9)

    if (isApplied) {
      appliedTotal += unitCost;
    }

    appliedItemsList.push({
      key,
      name: allLabels[key],
      isApplied,
      unitCost
    });
  });

  return {
    rule,
    ruleKey,
    appliedTotal,
    appliedItemsList
  };
}

/**
 * Calculates ingredient cost per cup (unrounded float)
 * 구입가격 ÷ 구입수량 × 사용량
 */
export function calculateIngredientCost(ingredient) {
  if (!ingredient) return 0;
  const price = parseNumber(ingredient.price);
  const qty = parseNumber(ingredient.qty);
  const usage = parseNumber(ingredient.usage);
  
  if (qty <= 0) return 0;
  return (price / qty) * usage;
}

/**
 * Calculates total beverage ingredients cost per cup (unrounded float)
 */
export function calculateTotalIngredientsCost(ingredientsList) {
  if (!Array.isArray(ingredientsList)) return 0;
  return ingredientsList.reduce((sum, ing) => {
    return sum + calculateIngredientCost(ing);
  }, 0);
}

/**
 * Calculates monthly fixed costs & labor costs (monthly totals)
 */
export function calculateMonthlyOverhead(fixedItems = {}, laborItems = {}) {
  const rent = parseNumber(fixedItems.rent);
  const utilities = parseNumber(fixedItems.utilities);
  const services = parseNumber(fixedItems.services);
  const otherFixed = parseNumber(fixedItems.otherFixed);
  const totalFixedMonth = rent + utilities + services + otherFixed;

  const salaries = parseNumber(laborItems.salaries);
  const insurance = parseNumber(laborItems.insurance);
  const otherLabor = parseNumber(laborItems.otherLabor);
  const totalLaborMonth = salaries + insurance + otherLabor;

  const totalOverheadMonth = totalFixedMonth + totalLaborMonth;

  return {
    rent,
    utilities,
    services,
    otherFixed,
    totalFixedMonth,

    salaries,
    insurance,
    otherLabor,
    totalLaborMonth,

    totalOverheadMonth
  };
}

/**
 * Calculates variable fees per cup (unrounded float)
 */
export function calculateVariableCosts(sellingPrice, cardFeeRate, deliveryFeeRate, extraVariableCost) {
  const price = parseNumber(sellingPrice);
  const cardPct = parseNumber(cardFeeRate);
  const delivPct = parseNumber(deliveryFeeRate);
  const extraCost = parseNumber(extraVariableCost);

  const cardFeeAmount = price * (cardPct / 100);
  const deliveryFeeAmount = price * (delivPct / 100);
  const totalPaymentFee = cardFeeAmount + deliveryFeeAmount;
  const totalVariableCost = totalPaymentFee + extraCost;

  return {
    cardFeeAmount,
    deliveryFeeAmount,
    totalPaymentFee,
    extraCost,
    totalVariableCost
  };
}

/**
 * Main Full Menu Cost Calculation Function
 * - 1잔 직접원가 (재료비 + 포장비 + 변동비 + 결제수수료)
 * - 선택적 월 고정비·인건비 1잔 배분 (판매잔수 입력 시에만 계산)
 * - 최종 1잔 원가 및 이익률 산출
 */
export function calculateFullMenuCost(state = {}) {
  const temp = state.temp || 'HOT';
  const serviceType = state.serviceType || 'STORE';
  const packPrices = state.packPrices || {};
  const packQtys = state.packQtys || {};
  const ingredients = state.ingredients || [];
  const cardFeeRate = state.cardFeeRate || 0;
  const deliveryFeeRate = state.deliveryFeeRate || 0;
  const extraVariableCost = state.extraVariableCost || 0;
  const monthlyVolume = parseNumber(state.monthlyVolume);
  const fixedItems = state.fixedItems || {};
  const laborItems = state.laborItems || {};
  const sellingPrice = parseNumber(state.sellingPrice);

  // 1. Direct 1-Cup Cost Components (unrounded float)
  // ④ 음료 재료비
  const ingredientCost = calculateTotalIngredientsCost(ingredients);
  // ⑤ 포장·소모품비
  const packRes = calculatePackagingTotal(temp, serviceType, packPrices, packQtys);
  const packagingCost = packRes.appliedTotal;
  // ⑥ 기타 1잔당 변동비 & ⑦ 결제수수료
  const varRes = calculateVariableCosts(sellingPrice, cardFeeRate, deliveryFeeRate, extraVariableCost);
  const extraCost = varRes.extraCost;
  const paymentFee = varRes.totalPaymentFee;
  const variableCost = varRes.totalVariableCost;

  // 1잔 직접원가 합계 = ④ + ⑤ + ⑥ + ⑦
  const directCostPerCup = ingredientCost + packagingCost + variableCost;

  // 2. Monthly Overhead Totals (월 고정비 & 월 인건비)
  const overheadRes = calculateMonthlyOverhead(fixedItems, laborItems);
  const totalFixedMonth = overheadRes.totalFixedMonth;
  const totalLaborMonth = overheadRes.totalLaborMonth;
  const totalOverheadMonth = overheadRes.totalOverheadMonth;

  // 3. ⑧ 고정비·인건비 배부 원가 (선택적)
  // 월 예상 판매 잔수가 입력된 경우(>0)에만 배분, 없으면 0원
  const isVolumeAllocated = monthlyVolume > 0;
  const fixedPerCup = isVolumeAllocated ? totalFixedMonth / monthlyVolume : 0;
  const laborPerCup = isVolumeAllocated ? totalLaborMonth / monthlyVolume : 0;
  const overheadPerCup = fixedPerCup + laborPerCup;

  // 4. ⑨ 최종 1잔 원가 = 직접원가 + 고정비·인건비 배부 원가
  const finalTotalCost = directCostPerCup + overheadPerCup;

  // 5. ⑩ 판매가격, ⑪ 잔당 이익, ⑫ 원가율, ⑬ 이익률
  const netProfit = sellingPrice - finalTotalCost;
  const costRatio = sellingPrice > 0 ? (finalTotalCost / sellingPrice) * 100 : 0;
  const profitRatio = sellingPrice > 0 ? (netProfit / sellingPrice) * 100 : 0;

  return {
    menuName: state.menuName || '',
    temp,
    serviceType,

    // 1잔 직접원가 항목
    ingredientCost,      // ④ 음료 재료비
    packagingCost,       // ⑤ 포장·소모품비
    packRes,
    extraCost,           // ⑥ 기타 1잔당 변동비
    paymentFee,          // ⑦ 결제수수료
    variableCost,        // ⑥ + ⑦ 합계
    varRes,
    directCostPerCup,    // 1잔 직접원가

    // 월간 지출 총액
    totalFixedMonth,     // ⑤ 월 고정비 합계
    totalLaborMonth,     // ⑥ 월 인건비 합계
    totalOverheadMonth,  // ⑦ 월 총 고정비 및 인건비
    overheadRes,

    // 선택적 1잔 배분 항목
    monthlyVolume,
    isVolumeAllocated,
    fixedPerCup,
    laborPerCup,
    overheadPerCup,      // ⑧ 고정비·인건비 배부 원가

    // 최종 결과
    finalTotalCost,      // ⑨ 최종 1잔 원가
    sellingPrice,        // ⑩ 판매가격
    netProfit,           // ⑪ 1잔당 이익
    costRatio,           // ⑫ 원가율
    profitRatio          // ⑬ 이익률
  };
}
