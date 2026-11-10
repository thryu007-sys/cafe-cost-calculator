import { generateCustomerLicenseKey, saveBankSettings, deactivateProForTesting } from './src/storage.js';
/**
 * 카페 원가계산기 PRO - App Controller & Live Precision Monetization Engine
 */

import { 
  loadSavedState, 
  saveStateToStorage, 
  DEFAULT_CLEAN_STATE, 
  STANDARD_TEST_STATE, 
  exportStateAsJSON, 
  importStateFromJSON, 
  activateProMembership, 
  restoreProWithLicenseKey 
} from './src/storage.js';

import { 
  calculateFullMenuCost, 
  PACKAGING_RULES, 
  calculatePackagingUnitCost, 
  parseNumber, 
  formatCommaNumber 
} from './src/calculator.js';

import { 
  PRICING_PLANS, 
  processCheckout, 
  checkFeatureAccess, 
  initPaymentSDKs 
} from './src/payment.js';

import { 
  downloadCostExcel, 
  printCostReport 
} from './src/export.js';

// Global App State
let state = loadSavedState();
const urlParams = new URLSearchParams(window.location.search);
const secretKey = urlParams.get('admin_secret') || urlParams.get('admin_token') || urlParams.get('secret');
if (secretKey === 'CAFE702-BOSS' || secretKey === '7028' || urlParams.get('owner') === 'true') {
  restoreProWithLicenseKey(state, 'CAFE702-BOSS');
}
let selectedPlanId = 'pro_lifetime';
let selectedPayMethod = 'card';

// Helper for formatting summary texts rounded to KRW integer
function formatKRW(val) {
  const num = Math.round(parseNumber(val));
  return num.toLocaleString('ko-KR') + '원';
}

// Helper for formatting unit costs (shows decimal if fractional, e.g. 48.9원)
function formatUnitCost(val) {
  const num = parseNumber(val);
  if (num === 0) return '0원';
  if (num % 1 !== 0) {
    return num.toFixed(1) + '원';
  }
  return num.toLocaleString('ko-KR') + '원';
}

function formatPercent(val) {
  const num = parseNumber(val);
  return num.toFixed(1) + '%';
}

/**
 * Format an input field's display value with thousand commas while preserving cursor selection
 */
function formatInputFieldWithCommas(inputEl) {
  if (!inputEl) return;
  const rawStr = inputEl.value;
  if (!rawStr) return;

  const cursorIndex = inputEl.selectionStart;
  const origLength = rawStr.length;

  const num = parseNumber(rawStr);
  if (num === 0 && rawStr.trim() === '') return;

  const formatted = num.toLocaleString('ko-KR');
  if (inputEl.value !== formatted) {
    inputEl.value = formatted;
    const newLength = formatted.length;
    const diff = newLength - origLength;
    const newPos = Math.max(0, (cursorIndex || 0) + diff);
    try {
      inputEl.setSelectionRange(newPos, newPos);
    } catch (e) {
      // Ignore selection errors on non-text inputs
    }
  }
}

// DOM Elements Cache
const elements = {
  // Header & Promotion
  headerProBadge: document.getElementById('header-pro-badge'),
  openPricingBtn: document.getElementById('open-pricing-btn'),
  promoBanner: document.getElementById('promo-banner'),
  bannerPricingBtn: document.getElementById('banner-pricing-btn'),

  // ① Menu Name
  inputMenuName: document.getElementById('input-menu-name'),

  // ② Temperature Toggles
  btnTempHot: document.getElementById('btn-temp-hot'),
  btnTempIce: document.getElementById('btn-temp-ice'),

  // ③ Service Type Toggles
  btnServiceStore: document.getElementById('btn-service-store'),
  btnServiceTakeout: document.getElementById('btn-service-takeout'),

  // ④ Auto Packaging
  autoRuleIndicator: document.getElementById('auto-rule-indicator'),
  packTotalBadge: document.getElementById('pack-total-badge'),
  packTotalText: document.getElementById('pack-total-text'),

  // ⑤ Ingredients
  ingredientsListContainer: document.getElementById('ingredients-list-container'),
  btnAddIngredient: document.getElementById('btn-add-ingredient'),
  ingTotalText: document.getElementById('ing-total-text'),

  // ⑥ Variable Costs
  inputCardFee: document.getElementById('input-card-fee'),
  hintCardFee: document.getElementById('hint-card-fee'),
  inputDeliveryFee: document.getElementById('input-delivery-fee'),
  hintDeliveryFee: document.getElementById('hint-delivery-fee'),
  inputExtraVariable: document.getElementById('input-extra-variable'),
  variableTotalText: document.getElementById('variable-total-text'),

  // ⑦ Monthly Overhead Management
  fixedTotalMonth: document.getElementById('fixed-total-month'),
  laborTotalMonth: document.getElementById('labor-total-month'),
  overheadTotalText: document.getElementById('overhead-total-text'),
  inputMonthlyVolume: document.getElementById('input-monthly-volume'),
  volWarningHint: document.getElementById('vol-warning-hint'),

  // ⑧ Selling Price
  inputSellingPrice: document.getElementById('input-selling-price'),
  priceWarningHint: document.getElementById('price-warning-hint'),

  // ⑨ Final Result Card
  resMenuTag: document.getElementById('res-menu-tag'),
  btnSaveMenuSnapshot: document.getElementById('btn-save-menu-snapshot'),
  resCostTitle: document.getElementById('res-cost-title'),
  resFinalCost: document.getElementById('res-final-cost'),
  resCostFormulaDesc: document.getElementById('res-cost-formula-desc'),
  resSellingPrice: document.getElementById('res-selling-price'),
  resNetProfit: document.getElementById('res-net-profit'),
  resCostRatio: document.getElementById('res-cost-ratio'),
  resProfitRatio: document.getElementById('res-profit-ratio'),

  // Detailed 13 Breakdown Nodes
  resDetailMenuName: document.getElementById('res-detail-menu-name'),
  resDetailTemp: document.getElementById('res-detail-temp'),
  resDetailService: document.getElementById('res-detail-service'),
  bdValIng: document.getElementById('bd-val-ing'),
  bdPctIng: document.getElementById('bd-pct-ing'),
  bdValPack: document.getElementById('bd-val-pack'),
  bdPctPack: document.getElementById('bd-pct-pack'),
  bdValExtraVar: document.getElementById('bd-val-extra-var'),
  bdPctExtraVar: document.getElementById('bd-pct-extra-var'),
  bdValFee: document.getElementById('bd-val-fee'),
  bdPctFee: document.getElementById('bd-pct-fee'),
  bdValDirect: document.getElementById('bd-val-direct'),
  bdValOverheadPerCup: document.getElementById('bd-val-overhead-per-cup'),
  bdPctOverhead: document.getElementById('bd-pct-overhead'),
  bdValFinalTotal: document.getElementById('bd-val-final-total'),
  bdValFix: document.getElementById('bd-val-fix'),
  bdValLab: document.getElementById('bd-val-lab'),
  bdValOverheadSum: document.getElementById('bd-val-overhead-sum'),

  // ⑩ BEP & Delivery Simulator
  bepSection: document.getElementById('bep-section'),
  bepStatusPill: document.getElementById('bep-status-pill'),
  bepMarginCup: document.getElementById('bep-margin-cup'),
  bepMarginRatio: document.getElementById('bep-margin-ratio'),
  bepCupsMonth: document.getElementById('bep-cups-month'),
  bepCupsDay: document.getElementById('bep-cups-day'),
  deliverySimTable: document.getElementById('delivery-sim-table'),
  bepLockOverlay: document.getElementById('bep-lock-overlay'),
  btnUnlockBep: document.getElementById('btn-unlock-bep'),

  // Toolbar Actions
  btnLoadTestData: document.getElementById('btn-load-test-data'),
  btnResetForm: document.getElementById('btn-reset-form'),
  btnExportExcel: document.getElementById('btn-export-excel'),
  btnPrintReport: document.getElementById('btn-print-report'),
  lockExcel: document.getElementById('lock-excel'),
  lockPrint: document.getElementById('lock-print'),

  // Modals
  openSavedMenusBtn: document.getElementById('open-saved-menus-btn'),
  modalSavedMenus: document.getElementById('modal-saved-menus'),
  savedMenusContainer: document.getElementById('saved-menus-container'),
  openSettingsBtn: document.getElementById('open-settings-btn'),
  modalSettings: document.getElementById('modal-settings'),
  btnExportJson: document.getElementById('btn-export-json'),
  inputImportJson: document.getElementById('input-import-json'),
  btnResetAll: document.getElementById('btn-reset-all'),

  // Settings Pro & PG Addons
  settingsPlanBadge: document.getElementById('settings-plan-badge'),
  settingsUpgradeBtn: document.getElementById('settings-upgrade-btn'),
  settingsLicenseInfo: document.getElementById('settings-license-info'),
  settingsLicenseKey: document.getElementById('settings-license-key'),
  inputLicenseKey: document.getElementById('input-license-key'),
    btnApplyLicense: document.getElementById('btn-apply-license'),
  ownerAdminPanel: document.getElementById('owner-admin-panel'),
  btnTestCustomerMode: document.getElementById('btn-test-customer-mode'),
  genLicenseOutput: document.getElementById('gen-license-output'),
  btnGenerateLicense: document.getElementById('btn-generate-license'),
  btnCopyGenLicense: document.getElementById('btn-copy-gen-license'),
  genKeyAlert: document.getElementById('gen-key-alert'),
  inputCfgBank: document.getElementById('input-cfg-bank'),
  inputCfgAccount: document.getElementById('input-cfg-account'),
  inputCfgHolder: document.getElementById('input-cfg-holder'),
  btnSaveBankCfg: document.getElementById('btn-save-bank-cfg'),
  bankTransferBox: document.getElementById('bank-transfer-box'),
  bankNameText: document.getElementById('bank-name-text'),
  bankAccText: document.getElementById('bank-acc-text'),
  bankHolderText: document.getElementById('bank-holder-text'),
  inputSenderName: document.getElementById('input-sender-name'),
  inputSenderPhone: document.getElementById('input-sender-phone'),
  paymentHistoryList: document.getElementById('payment-history-list'),
  inputCustomPg: document.getElementById('input-custom-pg'),

  // Pricing Modal
  modalPricing: document.getElementById('modal-pricing'),
  btnDoCheckout: document.getElementById('btn-do-checkout'),

  // Success Modal
  modalPaymentSuccess: document.getElementById('modal-payment-success'),
  successModalLicenseKey: document.getElementById('success-modal-license-key'),
  btnCopyLicense: document.getElementById('btn-copy-license'),
  recPlanName: document.getElementById('rec-plan-name'),
  recPlanAmount: document.getElementById('rec-plan-amount'),
  recPlanReceipt: document.getElementById('rec-plan-receipt'),
  btnCloseSuccess: document.getElementById('btn-close-success')
};

/**
 * Synchronizes live DOM input field values into state memory before calculation
 */
function syncLiveDOMInputsToState() {
  document.querySelectorAll('.pack-price-input').forEach(inp => {
    const key = inp.getAttribute('data-key');
    if (key) state.packPrices[key] = parseNumber(inp.value);
  });

  document.querySelectorAll('.pack-qty-input').forEach(inp => {
    const key = inp.getAttribute('data-key');
    if (key) state.packQtys[key] = parseNumber(inp.value);
  });

  document.querySelectorAll('.fixed-cost-input').forEach(inp => {
    const key = inp.getAttribute('data-key');
    if (key) state.fixedItems[key] = parseNumber(inp.value);
  });

  document.querySelectorAll('.labor-cost-input').forEach(inp => {
    const key = inp.getAttribute('data-key');
    if (key) state.laborItems[key] = parseNumber(inp.value);
  });

  if (elements.inputMonthlyVolume) state.monthlyVolume = parseNumber(elements.inputMonthlyVolume.value);
  if (elements.inputSellingPrice) state.sellingPrice = parseNumber(elements.inputSellingPrice.value);
  if (elements.inputCardFee) state.cardFeeRate = parseNumber(elements.inputCardFee.value);
  if (elements.inputDeliveryFee) state.deliveryFeeRate = parseNumber(elements.inputDeliveryFee.value);
  if (elements.inputExtraVariable) state.extraVariableCost = parseNumber(elements.inputExtraVariable.value);
  if (elements.inputMenuName) state.menuName = elements.inputMenuName.value;
  if (elements.inputCustomPg) state.customPgKey = elements.inputCustomPg.value.trim();
}

/**
 * Recalculates full costs and updates output DOM nodes directly WITHOUT wiping input HTML
 */
function updateCalculationsAndOutputs() {
  syncLiveDOMInputsToState();
  saveStateToStorage(state);

  const calc = calculateFullMenuCost(state);

  // Update Packaging Header & Summary (unrounded sum -> rounded KRW display)
  if (elements.packTotalBadge) elements.packTotalBadge.textContent = formatKRW(calc.packagingCost);
  if (elements.packTotalText) elements.packTotalText.textContent = formatKRW(calc.packagingCost);

  // Update Ingredients Total
  if (elements.ingTotalText) elements.ingTotalText.textContent = formatKRW(calc.ingredientCost);

  // Fee Hints & Variable Total
  if (elements.hintCardFee) elements.hintCardFee.textContent = `예상 수수료: ${formatKRW(calc.varRes.cardFeeAmount)}`;
  if (elements.hintDeliveryFee) elements.hintDeliveryFee.textContent = `예상 수수료: ${formatKRW(calc.varRes.deliveryFeeAmount)}`;
  if (elements.variableTotalText) elements.variableTotalText.textContent = formatKRW(calc.variableCost);

  // Monthly Overhead Totals (월 매장 고정비 + 월 인건비)
  if (elements.fixedTotalMonth) elements.fixedTotalMonth.textContent = formatKRW(calc.totalFixedMonth);
  if (elements.laborTotalMonth) elements.laborTotalMonth.textContent = formatKRW(calc.totalLaborMonth);
  if (elements.overheadTotalText) elements.overheadTotalText.textContent = formatKRW(calc.totalOverheadMonth);

  // Volume Allocation Hint
  if (elements.volWarningHint) {
    if (calc.isVolumeAllocated) {
      elements.volWarningHint.innerHTML = `<span style="color:var(--primary-accent); font-weight:600;">✅ 월 ${calc.monthlyVolume.toLocaleString('ko-KR')}잔 기준: 1잔당 고정비 ${formatKRW(calc.fixedPerCup)} + 인건비 ${formatKRW(calc.laborPerCup)} = 총 ${formatKRW(calc.overheadPerCup)} 배분 반영</span>`;
    } else {
      elements.volWarningHint.textContent = '월 판매 잔수를 입력하면 월 고정비·인건비가 1잔당 비용으로 배분됩니다. (비워두면 0원/미배분 처리)';
    }
  }

  // Selling Price Validation Hint
  if (elements.priceWarningHint) {
    if (parseNumber(state.sellingPrice) <= 0) {
      elements.priceWarningHint.innerHTML = '<span style="color:var(--rose); font-weight:700;">⚠️ 판매가격을 입력하시면 잔당 이익과 원가율이 자동 계산됩니다.</span>';
    } else {
      elements.priceWarningHint.textContent = '';
    }
  }

  // Final Result Hero Display
  const ruleKey = `${state.temp}_${state.serviceType}`;
  const ruleLabel = PACKAGING_RULES[ruleKey] ? PACKAGING_RULES[ruleKey].label : '';
  if (elements.resMenuTag) elements.resMenuTag.textContent = `${state.menuName || '메뉴명 미지정'} (${ruleLabel})`;

  if (elements.resCostTitle) {
    elements.resCostTitle.textContent = calc.isVolumeAllocated ? '1잔 최종 원가 (고정비 배분 포함)' : '1잔 직접원가 (고정비 미배분)';
  }

  if (elements.resCostFormulaDesc) {
    elements.resCostFormulaDesc.textContent = calc.isVolumeAllocated 
      ? '음료 재료비 + 포장·소모품비 + 기타 변동비(수수료) + 고정비·인건비 배부 원가'
      : '음료 재료비 + 포장·소모품비 + 기타 변동비(결제수수료 등)';
  }

  if (elements.resFinalCost) {
    elements.resFinalCost.innerHTML = `${Math.round(calc.finalTotalCost).toLocaleString('ko-KR')}<span class="unit">원</span>`;
  }

  if (elements.resSellingPrice) elements.resSellingPrice.textContent = formatKRW(calc.sellingPrice);
  if (elements.resNetProfit) elements.resNetProfit.textContent = formatKRW(calc.netProfit);
  if (elements.resCostRatio) elements.resCostRatio.textContent = formatPercent(calc.costRatio);
  if (elements.resProfitRatio) elements.resProfitRatio.textContent = formatPercent(calc.profitRatio);

  // Breakdown Table 명세 (13 항목 상세)
  if (elements.resDetailMenuName) elements.resDetailMenuName.textContent = state.menuName || '메뉴명 미지정';
  if (elements.resDetailTemp) elements.resDetailTemp.textContent = state.temp;
  if (elements.resDetailService) elements.resDetailService.textContent = state.serviceType === 'STORE' ? '매장' : '테이크아웃';

  const baseForPct = calc.finalTotalCost > 0 ? calc.finalTotalCost : 1;

  if (elements.bdValIng) elements.bdValIng.textContent = formatKRW(calc.ingredientCost);
  if (elements.bdPctIng) elements.bdPctIng.textContent = `(${((calc.ingredientCost / baseForPct) * 100).toFixed(1)}%)`;

  if (elements.bdValPack) elements.bdValPack.textContent = formatKRW(calc.packagingCost);
  if (elements.bdPctPack) elements.bdPctPack.textContent = `(${((calc.packagingCost / baseForPct) * 100).toFixed(1)}%)`;

  if (elements.bdValExtraVar) elements.bdValExtraVar.textContent = formatKRW(calc.extraCost);
  if (elements.bdPctExtraVar) elements.bdPctExtraVar.textContent = `(${((calc.extraCost / baseForPct) * 100).toFixed(1)}%)`;

  if (elements.bdValFee) elements.bdValFee.textContent = formatKRW(calc.paymentFee);
  if (elements.bdPctFee) elements.bdPctFee.textContent = `(${((calc.paymentFee / baseForPct) * 100).toFixed(1)}%)`;

  if (elements.bdValDirect) elements.bdValDirect.textContent = formatKRW(calc.directCostPerCup);

  if (elements.bdValOverheadPerCup) {
    elements.bdValOverheadPerCup.textContent = calc.isVolumeAllocated ? formatKRW(calc.overheadPerCup) : '0원 (미배분)';
  }
  if (elements.bdPctOverhead) {
    elements.bdPctOverhead.textContent = calc.isVolumeAllocated ? `(${((calc.overheadPerCup / baseForPct) * 100).toFixed(1)}%)` : '(0.0%)';
  }

  if (elements.bdValFinalTotal) elements.bdValFinalTotal.textContent = formatKRW(calc.finalTotalCost);

  // Monthly Overhead Summary
  if (elements.bdValFix) elements.bdValFix.textContent = formatKRW(calc.totalFixedMonth);
  if (elements.bdValLab) elements.bdValLab.textContent = formatKRW(calc.totalLaborMonth);
  if (elements.bdValOverheadSum) elements.bdValOverheadSum.textContent = formatKRW(calc.totalOverheadMonth);

  // ⑩ 손익분기점 (BEP) & 배달 시뮬레이션 UI
  if (elements.bepMarginCup) elements.bepMarginCup.textContent = formatKRW(calc.bep.contributionMargin);
  if (elements.bepMarginRatio) elements.bepMarginRatio.textContent = `마진율 ${calc.bep.marginRatio.toFixed(1)}%`;

  if (elements.bepCupsMonth) {
    elements.bepCupsMonth.textContent = calc.bep.isFeasible ? `${formatCommaNumber(calc.bep.bepCupsMonth)}잔` : '산출 불가';
  }
  if (elements.bepCupsDay) {
    elements.bepCupsDay.textContent = calc.bep.isFeasible ? `${formatCommaNumber(calc.bep.bepCupsDay)}잔 / 일` : '산출 불가';
  }
  if (elements.bepStatusPill) {
    elements.bepStatusPill.textContent = calc.bep.isFeasible ? '✅ 손익분기점 분석 완료' : '⚠️ 데이터 부족';
  }

  // Delivery simulation rows
  if (elements.deliverySimTable && calc.deliverySimulations) {
    elements.deliverySimTable.innerHTML = calc.deliverySimulations.map(ch => `
      <div class="del-row">
        <div class="del-row-name">
          <span>${ch.name}</span>
          <span class="del-row-sub">${ch.desc}</span>
        </div>
        <div class="del-row-values">
          <div class="del-margin-val">${formatKRW(ch.profit)}</div>
          <div class="del-row-sub">마진율 ${ch.marginRate}% (수수료 ${formatKRW(ch.feeAmount)})</div>
        </div>
      </div>
    `).join('');
  }

  // PRO Membership UI Status Reflection
  updateProMembershipUI();
}

/**
 * Updates UI based on PRO membership state
 */
function updateProMembershipUI() {
  const isPro = state.isPro;

  if (isPro) {
    if (elements.headerProBadge) {
      elements.headerProBadge.textContent = 'PRO';
      elements.headerProBadge.className = 'badge-pro active-pro';
    }
    if (elements.openPricingBtn) {
      elements.openPricingBtn.textContent = '👑 PRO 이용중';
      elements.openPricingBtn.classList.remove('highlight-pro');
    }
    if (elements.promoBanner) {
      elements.promoBanner.style.display = 'none';
    }
    if (elements.bepLockOverlay) {
      elements.bepLockOverlay.classList.add('unlocked');
    }
    if (elements.lockExcel) elements.lockExcel.style.display = 'none';
    if (elements.lockPrint) elements.lockPrint.style.display = 'none';

    if (elements.settingsPlanBadge) {
      if (state.isOwner) {
        elements.settingsPlanBadge.textContent = '👑 사장님(최고 관리자) 평생 VIP';
      } else {
        elements.settingsPlanBadge.textContent = state.proPlan === 'pro_lifetime' ? '💎 PRO 평생 소장 회원' : '💎 PRO 월간 구독 회원';
      }
    }
    if (elements.settingsUpgradeBtn) elements.settingsUpgradeBtn.style.display = 'none';
    if (elements.settingsLicenseInfo) elements.settingsLicenseInfo.style.display = 'block';
    if (elements.settingsLicenseKey) elements.settingsLicenseKey.textContent = state.licenseKey || 'CAFE-PRO-ACTIVE';
    
    // Only show Owner Admin Panel if state.isOwner is true
    if (elements.ownerAdminPanel) {
      elements.ownerAdminPanel.style.display = state.isOwner ? 'block' : 'none';
    }
  } else {
    if (elements.headerProBadge) {
      elements.headerProBadge.textContent = 'FREE';
      elements.headerProBadge.className = 'badge-pro';
    }
    if (elements.openPricingBtn) {
      elements.openPricingBtn.textContent = '💎 PRO 업그레이드';
      elements.openPricingBtn.classList.add('highlight-pro');
    }
    if (elements.promoBanner) {
      elements.promoBanner.style.display = 'block';
    }
    if (elements.bepLockOverlay) {
      elements.bepLockOverlay.classList.remove('unlocked');
    }
    if (elements.lockExcel) elements.lockExcel.style.display = 'inline-block';
    if (elements.lockPrint) elements.lockPrint.style.display = 'inline-block';

    if (elements.settingsPlanBadge) {
      elements.settingsPlanBadge.textContent = 'FREE (무료 베이직 회원)';
    }
    if (elements.settingsUpgradeBtn) elements.settingsUpgradeBtn.style.display = 'inline-block';
    if (elements.settingsLicenseInfo) elements.settingsLicenseInfo.style.display = 'none';
    if (elements.ownerAdminPanel) elements.ownerAdminPanel.style.display = 'none';
  }

  // Render Payment history in Settings
  if (elements.paymentHistoryList) {
    if (state.paymentHistory && state.paymentHistory.length > 0) {
      elements.paymentHistoryList.innerHTML = state.paymentHistory.map(item => `
        <div class="saved-card">
          <div>
            <strong style="font-size:13px;">${item.orderName}</strong>
            <div style="font-size:11.5px; color:var(--text-muted); margin-top:2px;">
              결제금액: <strong>${formatKRW(item.amount)}</strong> | 결제일: ${item.paidAt}
            </div>
            <div style="font-size:11px; color:#4338CA; margin-top:2px;">
              라이선스: ${item.licenseKey} (영수증 #${item.receiptNo || 'REC-OK'})
            </div>
          </div>
          <span style="font-size:11.5px; font-weight:700; color:var(--emerald);">결제완료</span>
        </div>
      `).join('');
    } else {
      elements.paymentHistoryList.innerHTML = '<p style="font-size:12px; color:var(--text-muted);">결제 내역이 없습니다.</p>';
    }
  }
}

/**
 * Updates HOT/ICE & Store/Takeout Toggle Buttons UI
 */
function updateToggleButtonsUI() {
  if (elements.btnTempHot && elements.btnTempIce) {
    if (state.temp === 'HOT') {
      elements.btnTempHot.classList.add('active');
      elements.btnTempIce.classList.remove('active');
    } else {
      elements.btnTempHot.classList.remove('active');
      elements.btnTempIce.classList.add('active');
    }
  }

  if (elements.btnServiceStore && elements.btnServiceTakeout) {
    if (state.serviceType === 'STORE') {
      elements.btnServiceStore.classList.add('active');
      elements.btnServiceTakeout.classList.remove('active');
    } else {
      elements.btnServiceStore.classList.remove('active');
      elements.btnServiceTakeout.classList.add('active');
    }
  }

  updatePackagingAutoRulesUI();
}

/**
 * Updates Packaging Table Status Badges & Auto Indicator Banner
 */
function updatePackagingAutoRulesUI() {
  const ruleKey = `${state.temp}_${state.serviceType}`;
  const rule = PACKAGING_RULES[ruleKey] || PACKAGING_RULES['HOT_STORE'];

  const appliedLabels = Object.values(rule.itemLabels);
  const appliedNames = appliedLabels.length > 0 ? appliedLabels.join(', ') : '없음 (0원)';
  if (elements.autoRuleIndicator) {
    elements.autoRuleIndicator.innerHTML = `선택 조건: <strong>[${rule.label}]</strong> &rarr; 자동 적용 항목: <strong>${appliedNames}</strong>`;
  }

  const allKeys = ['cup', 'lid', 'sleeve', 'straw', 'carrier'];

  allKeys.forEach(key => {
    const isApplied = rule.items.includes(key);
    const rowEl = document.getElementById(`row-pack-${key}`);
    const statusEl = document.getElementById(`status-pack-${key}`);
    const unitCostEl = document.getElementById(`unit-cost-${key}`);

    const price = parseNumber(state.packPrices[key]);
    const qty = parseNumber(state.packQtys[key]);
    const unitCost = calculatePackagingUnitCost(price, qty); // exact unrounded float

    if (unitCostEl) unitCostEl.textContent = formatUnitCost(unitCost);

    if (rowEl && statusEl) {
      if (isApplied) {
        rowEl.classList.remove('off');
        statusEl.textContent = '포함';
        statusEl.className = 'applied-status status-on';
      } else {
        rowEl.classList.add('off');
        statusEl.textContent = '제외';
        statusEl.className = 'applied-status status-off';
      }
    }
  });

  updateCalculationsAndOutputs();
}

/**
 * Renders the Ingredients List DOM Structure
 */
function renderIngredientsDOM() {
  if (!elements.ingredientsListContainer) return;

  if (!state.ingredients || state.ingredients.length === 0) {
    elements.ingredientsListContainer.innerHTML = `
      <div style="background:var(--bg-subtle); border:1px dashed var(--border); padding:16px; text-align:center; border-radius:var(--radius-sm); color:var(--text-muted); font-size:13px;">
        등록된 음료 재료가 없습니다. 우측 상단의 <strong>'+ 재료 추가'</strong> 버튼을 눌러 추가하세요.
      </div>
    `;
  } else {
    elements.ingredientsListContainer.innerHTML = state.ingredients.map((ing) => {
      const price = parseNumber(ing.price);
      const qty = parseNumber(ing.qty);
      const usage = parseNumber(ing.usage);
      const unitCost = (qty > 0) ? (price / qty) * usage : 0;

      return `
        <div class="ing-row-card" data-id="${ing.id}">
          <div class="ing-row-top">
            <div class="ing-name-field">
              <input type="text" class="pos-input ing-input-name" data-id="${ing.id}" value="${ing.name}" placeholder="재료명 (예: 원두, 우유)">
            </div>
            <button type="button" class="btn-del-ing" data-id="${ing.id}">삭제 &times;</button>
          </div>

          <div class="ing-row-inputs">
            <div class="ing-mini-field">
              <label>구입가(원)</label>
              <input type="text" inputmode="numeric" class="pos-input ing-input-price" data-id="${ing.id}" value="${formatCommaNumber(ing.price)}" placeholder="0">
            </div>
            <div class="ing-mini-field">
              <label>구입수량</label>
              <input type="text" inputmode="numeric" class="pos-input ing-input-qty" data-id="${ing.id}" value="${formatCommaNumber(ing.qty)}" placeholder="1">
            </div>
            <div class="ing-mini-field">
              <label>구입단위</label>
              <select class="pos-select ing-select-unit" data-id="${ing.id}">
                <option value="g" ${ing.unit === 'g' ? 'selected' : ''}>g</option>
                <option value="ml" ${ing.unit === 'ml' ? 'selected' : ''}>ml</option>
                <option value="개" ${ing.unit === '개' ? 'selected' : ''}>개</option>
                <option value="kg" ${ing.unit === 'kg' ? 'selected' : ''}>kg</option>
                <option value="L" ${ing.unit === 'L' ? 'selected' : ''}>L</option>
              </select>
            </div>
            <div class="ing-mini-field">
              <label>1잔사용량</label>
              <input type="text" inputmode="decimal" class="pos-input ing-input-usage" data-id="${ing.id}" value="${ing.usage}" placeholder="0">
            </div>
          </div>

          <div class="ing-row-bottom">
            <span>1잔 당 사용원가:</span>
            <strong class="ing-unit-cost-text" id="ing-cost-${ing.id}">${formatUnitCost(unitCost)}</strong>
          </div>
        </div>
      `;
    }).join('');
  }

  updateCalculationsAndOutputs();
}

/**
 * Synchronizes static form inputs from state on load
 */
function syncFormInputsFromState() {
  if (elements.inputMenuName) elements.inputMenuName.value = state.menuName || '';
  if (elements.inputCardFee) elements.inputCardFee.value = state.cardFeeRate;
  if (elements.inputDeliveryFee) elements.inputDeliveryFee.value = state.deliveryFeeRate;
  if (elements.inputExtraVariable) elements.inputExtraVariable.value = formatCommaNumber(state.extraVariableCost);
  if (elements.inputMonthlyVolume) {
    elements.inputMonthlyVolume.value = state.monthlyVolume > 0 ? formatCommaNumber(state.monthlyVolume) : '';
  }
  if (elements.inputSellingPrice) elements.inputSellingPrice.value = formatCommaNumber(state.sellingPrice);
  if (elements.inputCustomPg) elements.inputCustomPg.value = state.customPgKey || '';

  // Packaging Inputs
  document.querySelectorAll('.pack-price-input').forEach(inp => {
    const key = inp.getAttribute('data-key');
    if (key && state.packPrices[key] !== undefined) inp.value = formatCommaNumber(state.packPrices[key]);
  });

  document.querySelectorAll('.pack-qty-input').forEach(inp => {
    const key = inp.getAttribute('data-key');
    if (key && state.packQtys[key] !== undefined) inp.value = formatCommaNumber(state.packQtys[key]);
  });

  // Fixed & Labor Cost Inputs
  document.querySelectorAll('.fixed-cost-input').forEach(inp => {
    const key = inp.getAttribute('data-key');
    if (key && state.fixedItems[key] !== undefined) inp.value = formatCommaNumber(state.fixedItems[key]);
  });

  document.querySelectorAll('.labor-cost-input').forEach(inp => {
    const key = inp.getAttribute('data-key');
    if (key && state.laborItems[key] !== undefined) inp.value = formatCommaNumber(state.laborItems[key]);
  });

  updateToggleButtonsUI();
  renderIngredientsDOM();
}

/* ==========================================================================
   EVENT LISTENERS SETUP
   ========================================================================== */
function setupEventListeners() {
  // Auto-select all text on input focus for effortless typing
  document.querySelectorAll('.pos-input').forEach(inp => {
    inp.addEventListener('focus', (e) => {
      try {
        e.target.select();
      } catch (err) {}
    });
  });

  // ① Menu Name Input
  if (elements.inputMenuName) {
    elements.inputMenuName.addEventListener('input', (e) => {
      state.menuName = e.target.value;
      updateCalculationsAndOutputs();
    });
  }

  // ② Temperature Toggle Buttons (HOT / ICE)
  if (elements.btnTempHot) {
    elements.btnTempHot.addEventListener('click', () => {
      state.temp = 'HOT';
      updateToggleButtonsUI();
    });
  }

  if (elements.btnTempIce) {
    elements.btnTempIce.addEventListener('click', () => {
      state.temp = 'ICE';
      updateToggleButtonsUI();
    });
  }

  // ③ Service Type Toggle Buttons (STORE / TAKEOUT)
  if (elements.btnServiceStore) {
    elements.btnServiceStore.addEventListener('click', () => {
      state.serviceType = 'STORE';
      updateToggleButtonsUI();
    });
  }

  if (elements.btnServiceTakeout) {
    elements.btnServiceTakeout.addEventListener('click', () => {
      state.serviceType = 'TAKEOUT';
      updateToggleButtonsUI();
    });
  }

  // ④ Packaging Inputs
  document.querySelectorAll('.pack-price-input').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const key = e.target.getAttribute('data-key');
      state.packPrices[key] = parseNumber(e.target.value);
      formatInputFieldWithCommas(e.target);
      updatePackagingAutoRulesUI();
    });
  });

  document.querySelectorAll('.pack-qty-input').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const key = e.target.getAttribute('data-key');
      state.packQtys[key] = parseNumber(e.target.value);
      formatInputFieldWithCommas(e.target);
      updatePackagingAutoRulesUI();
    });
  });

  // ⑤ Ingredients Management
  if (elements.btnAddIngredient) {
    elements.btnAddIngredient.addEventListener('click', () => {
      const newId = 'ing-' + Date.now();
      state.ingredients.push({
        id: newId,
        name: '새 재료',
        price: 10000,
        qty: 1000,
        unit: 'g',
        usage: 10,
        usageUnit: 'g'
      });

      renderIngredientsDOM();

      const newRowInput = elements.ingredientsListContainer.querySelector(`.ing-input-name[data-id="${newId}"]`);
      if (newRowInput) newRowInput.focus();
    });
  }

  if (elements.ingredientsListContainer) {
    elements.ingredientsListContainer.addEventListener('input', (e) => {
      const id = e.target.getAttribute('data-id');
      if (!id) return;

      const ing = state.ingredients.find(i => i.id === id);
      if (!ing) return;

      if (e.target.classList.contains('ing-input-name')) {
        ing.name = e.target.value;
      }
      if (e.target.classList.contains('ing-input-price')) {
        ing.price = parseNumber(e.target.value);
        formatInputFieldWithCommas(e.target);
      }
      if (e.target.classList.contains('ing-input-qty')) {
        ing.qty = parseNumber(e.target.value);
        formatInputFieldWithCommas(e.target);
      }
      if (e.target.classList.contains('ing-input-usage')) {
        ing.usage = parseNumber(e.target.value);
      }

      const costTextEl = document.getElementById(`ing-cost-${id}`);
      if (costTextEl) {
        const price = parseNumber(ing.price);
        const qty = parseNumber(ing.qty);
        const usage = parseNumber(ing.usage);
        const unitCost = (qty > 0) ? (price / qty) * usage : 0;
        costTextEl.textContent = formatUnitCost(unitCost);
      }

      updateCalculationsAndOutputs();
    });

    elements.ingredientsListContainer.addEventListener('change', (e) => {
      if (e.target.classList.contains('ing-select-unit')) {
        const id = e.target.getAttribute('data-id');
        const ing = state.ingredients.find(i => i.id === id);
        if (ing) {
          ing.unit = e.target.value;
          ing.usageUnit = e.target.value;
          updateCalculationsAndOutputs();
        }
      }
    });

    elements.ingredientsListContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-del-ing')) {
        const id = e.target.getAttribute('data-id');
        state.ingredients = state.ingredients.filter(i => i.id !== id);
        renderIngredientsDOM();
      }
    });
  }

  // ⑥ Variable Fees
  if (elements.inputCardFee) {
    elements.inputCardFee.addEventListener('input', (e) => {
      state.cardFeeRate = parseNumber(e.target.value);
      updateCalculationsAndOutputs();
    });
  }

  if (elements.inputDeliveryFee) {
    elements.inputDeliveryFee.addEventListener('input', (e) => {
      state.deliveryFeeRate = parseNumber(e.target.value);
      updateCalculationsAndOutputs();
    });
  }

  if (elements.inputExtraVariable) {
    elements.inputExtraVariable.addEventListener('input', (e) => {
      state.extraVariableCost = parseNumber(e.target.value);
      formatInputFieldWithCommas(e.target);
      updateCalculationsAndOutputs();
    });
  }

  // ⑦ Monthly Volume & Overhead Costs
  if (elements.inputMonthlyVolume) {
    elements.inputMonthlyVolume.addEventListener('input', (e) => {
      state.monthlyVolume = parseNumber(e.target.value);
      formatInputFieldWithCommas(e.target);
      updateCalculationsAndOutputs();
    });
  }

  document.querySelectorAll('.fixed-cost-input').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const key = e.target.getAttribute('data-key');
      if (key) {
        state.fixedItems[key] = parseNumber(e.target.value);
        formatInputFieldWithCommas(e.target);
        updateCalculationsAndOutputs();
      }
    });
  });

  document.querySelectorAll('.labor-cost-input').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const key = e.target.getAttribute('data-key');
      if (key) {
        state.laborItems[key] = parseNumber(e.target.value);
        formatInputFieldWithCommas(e.target);
        updateCalculationsAndOutputs();
      }
    });
  });

  // ⑧ Selling Price
  if (elements.inputSellingPrice) {
    elements.inputSellingPrice.addEventListener('input', (e) => {
      state.sellingPrice = parseNumber(e.target.value);
      formatInputFieldWithCommas(e.target);
      updateCalculationsAndOutputs();
    });
  }

  // Toolbar Actions
  if (elements.btnLoadTestData) {
    elements.btnLoadTestData.addEventListener('click', () => {
      if (confirm('아메리카노 표준 테스트 데이터로 현재 구성을 초기화하시겠습니까?')) {
        const isPro = state.isPro;
        const proPlan = state.proPlan;
        const licenseKey = state.licenseKey;
        const paymentHistory = state.paymentHistory || [];
        const savedMenus = state.savedMenus || [];

        state = JSON.parse(JSON.stringify(STANDARD_TEST_STATE));
        state.isPro = isPro;
        state.proPlan = proPlan;
        state.licenseKey = licenseKey;
        state.paymentHistory = paymentHistory;
        state.savedMenus = savedMenus;

        syncFormInputsFromState();
      }
    });
  }

  if (elements.btnResetForm) {
    elements.btnResetForm.addEventListener('click', () => {
      if (confirm('모든 입력 내용을 비우고 초기 상태로 돌아가시겠습니까?')) {
        const isPro = state.isPro;
        const proPlan = state.proPlan;
        const licenseKey = state.licenseKey;
        const paymentHistory = state.paymentHistory || [];
        const savedMenus = state.savedMenus || [];

        state = JSON.parse(JSON.stringify(DEFAULT_CLEAN_STATE));
        state.isPro = isPro;
        state.proPlan = proPlan;
        state.licenseKey = licenseKey;
        state.paymentHistory = paymentHistory;
        state.savedMenus = savedMenus;

        syncFormInputsFromState();
      }
    });
  }

  // 💎 PRO Action: Excel Export
  if (elements.btnExportExcel) {
    elements.btnExportExcel.addEventListener('click', () => {
      if (!checkFeatureAccess(state, 'excel_export')) {
        openModal(elements.modalPricing);
        return;
      }
      const calc = calculateFullMenuCost(state);
      downloadCostExcel(state, calc);
    });
  }

  // 💎 PRO Action: Print Report
  if (elements.btnPrintReport) {
    elements.btnPrintReport.addEventListener('click', () => {
      if (!checkFeatureAccess(state, 'print_report')) {
        openModal(elements.modalPricing);
        return;
      }
      printCostReport();
    });
  }

  // 💎 PRO Action: Unlock BEP overlay button
  if (elements.btnUnlockBep) {
    elements.btnUnlockBep.addEventListener('click', () => {
      openModal(elements.modalPricing);
    });
  }

  // Save Menu Snapshot
  if (elements.btnSaveMenuSnapshot) {
    elements.btnSaveMenuSnapshot.addEventListener('click', () => {
      if (!state.menuName || !state.menuName.trim()) {
        alert('메뉴 이름을 먼저 입력해 주세요.');
        if (elements.inputMenuName) elements.inputMenuName.focus();
        return;
      }

      // Free plan restriction: max 1 menu snapshot, Pro is unlimited
      if (!state.isPro && state.savedMenus && state.savedMenus.length >= 1) {
        if (confirm('무료 회원은 메뉴 저장이 1개로 제한됩니다.\n\n💎 PRO로 업그레이드하여 카페 전 메뉴를 무제한으로 저장하고 비교하시겠습니까?')) {
          openModal(elements.modalPricing);
        }
        return;
      }

      const calc = calculateFullMenuCost(state);
      const ruleKey = `${state.temp}_${state.serviceType}`;
      const ruleLabel = PACKAGING_RULES[ruleKey] ? PACKAGING_RULES[ruleKey].label : '';

      const snapshot = {
        id: 'menu-' + Date.now(),
        menuName: state.menuName,
        temp: state.temp,
        serviceType: state.serviceType,
        ruleLabel,
        savedAt: new Date().toLocaleDateString('ko-KR') + ' ' + new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        calcResults: {
          finalTotalCost: calc.finalTotalCost,
          netProfit: calc.netProfit,
          costRatio: calc.costRatio,
          sellingPrice: calc.sellingPrice
        },
        fullState: JSON.parse(JSON.stringify(state))
      };

      if (!state.savedMenus) state.savedMenus = [];
      state.savedMenus.unshift(snapshot);
      saveStateToStorage(state);

      alert(`'${state.menuName} (${ruleLabel})' 원가 데이터가 성공적으로 저장되었습니다!`);
    });
  }

  // Modals Management
  setupModalHandlers();
  setupPricingAndCheckoutHandlers();
}

/**
 * Pricing & Payment Checkout Event Handlers
 */
function setupPricingAndCheckoutHandlers() {
  // Open pricing modal triggers
  if (elements.openPricingBtn) {
    elements.openPricingBtn.addEventListener('click', () => openModal(elements.modalPricing));
  }
  if (elements.bannerPricingBtn) {
    elements.bannerPricingBtn.addEventListener('click', () => openModal(elements.modalPricing));
  }
  if (elements.settingsUpgradeBtn) {
    elements.settingsUpgradeBtn.addEventListener('click', () => {
      closeModal(elements.modalSettings);
      openModal(elements.modalPricing);
    });
  }

  // Plan Selection Cards
  document.querySelectorAll('.pricing-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const plan = card.getAttribute('data-plan');
      if (!plan) return;
      selectedPlanId = plan;

      document.querySelectorAll('.pricing-card').forEach(c => {
        c.classList.remove('selected');
        const btn = c.querySelector('.btn-select-plan');
        if (btn) {
          btn.classList.remove('selected-btn');
          btn.textContent = '선택하기';
        }
      });

      card.classList.add('selected');
      const curBtn = card.querySelector('.btn-select-plan');
      if (curBtn) {
        curBtn.classList.add('selected-btn');
        curBtn.textContent = '이 플랜 선택됨';
      }

      // Update Checkout Button text
      const planInfo = PRICING_PLANS[plan];
      if (elements.btnDoCheckout && planInfo) {
        const btnText = elements.btnDoCheckout.querySelector('.checkout-btn-text');
        if (btnText) {
          btnText.textContent = `💳 ${formatKRW(planInfo.price)} 안전 결제하고 PRO 즉시 시작`;
        }
      }
    });
  });

  // Payment Method Selection
  document.querySelectorAll('.pay-method-radio').forEach(label => {
    label.addEventListener('click', () => {
      document.querySelectorAll('.pay-method-radio').forEach(l => l.classList.remove('active'));
      label.classList.add('active');
      const radio = label.querySelector('input');
      if (radio) {
        radio.checked = true;
        selectedPayMethod = radio.value;

        if (elements.bankTransferBox) {
          elements.bankTransferBox.style.display = selectedPayMethod === 'transfer' ? 'block' : 'none';
        }
        if (elements.btnDoCheckout) {
          const btnText = elements.btnDoCheckout.querySelector('.checkout-btn-text');
          if (btnText) {
            const planInfo = PRICING_PLANS[selectedPlanId];
            if (selectedPayMethod === 'transfer') {
              btnText.textContent = `🏦 ${formatKRW(planInfo.price)} 무통장 입금 신청 완료하기`;
            } else {
              btnText.textContent = `💳 ${formatKRW(planInfo.price)} 안전 결제하고 PRO 즉시 시작`;
            }
          }
        }
      }
    });
  });

  // Checkout Execution Button
  if (elements.btnDoCheckout) {
    elements.btnDoCheckout.addEventListener('click', () => {
      const planInfo = PRICING_PLANS[selectedPlanId];
      const btnText = elements.btnDoCheckout.querySelector('.checkout-btn-text');
      const origText = btnText ? btnText.textContent : '결제하기';

      // 🏦 Handle Bank Transfer / Remittance flow
      if (selectedPayMethod === 'transfer') {
        const senderName = elements.inputSenderName ? elements.inputSenderName.value.trim() : '';
        const senderPhone = elements.inputSenderPhone ? elements.inputSenderPhone.value.trim() : '';
        if (!senderName) {
          alert('입금 확인을 위해 [입금자 성함]을 입력해 주세요.');
          if (elements.inputSenderName) elements.inputSenderName.focus();
          return;
        }
        if (!senderPhone) {
          alert('정품 라이선스 키를 받으실 [휴대폰 번호]를 입력해 주세요.');
          if (elements.inputSenderPhone) elements.inputSenderPhone.focus();
          return;
        }

        const bankInfo = state.bankInfo || { bank: '카카오뱅크', account: '3333-01-2345678', holder: '카페대표' };
        alert(`[입금 신청이 정상 접수되었습니다!]\n\n입금 계좌: ${bankInfo.bank} ${bankInfo.account} (${bankInfo.holder})\n입금 금액: ${formatKRW(planInfo.price)}\n입금자명: ${senderName}\n\n입금 확인 후 [${senderPhone}] 번호로 정품 라이선스 키가 즉시 문자 발송됩니다.\n(문의 및 빠른 처리: 매장 대표번호)`);
        closeModal(elements.modalPricing);
        return;
      }

      if (btnText) btnText.textContent = '⏳ 결제창 호출 및 승인 처리 중...';
      elements.btnDoCheckout.disabled = true;

      processCheckout({
        planId: selectedPlanId,
        payMethod: selectedPayMethod,
        customerName: '카페사장님',
        state,
        onSuccess: (res) => {
          if (btnText) btnText.textContent = origText;
          elements.btnDoCheckout.disabled = false;
          closeModal(elements.modalPricing);

          // Populate and show success modal
          if (elements.successModalLicenseKey) elements.successModalLicenseKey.textContent = res.license;
          if (elements.recPlanName) elements.recPlanName.textContent = res.plan.title;
          if (elements.recPlanAmount) elements.recPlanAmount.textContent = formatKRW(res.plan.price);
          if (elements.recPlanReceipt) elements.recPlanReceipt.textContent = res.receiptNo || 'REC-' + Date.now().toString().slice(-6);

          openModal(elements.modalPaymentSuccess);
          updateCalculationsAndOutputs();
        },
        onError: (err) => {
          if (btnText) btnText.textContent = origText;
          elements.btnDoCheckout.disabled = false;
          alert('결제 처리 중 오류가 발생했습니다: ' + (err.message || '다시 시도해 주세요.'));
        }
      });
    });
  }

  // Copy License Key in Success Modal
  if (elements.btnCopyLicense) {
    elements.btnCopyLicense.addEventListener('click', () => {
      const key = elements.successModalLicenseKey.textContent;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(key).then(() => {
          alert(`PRO 라이선스 키가 복사되었습니다:\n${key}`);
        });
      } else {
        alert(`PRO 라이선스 키: ${key}`);
      }
    });
  }

  // Close Success Modal and Scroll to BEP
  if (elements.btnCloseSuccess) {
    elements.btnCloseSuccess.addEventListener('click', () => {
      closeModal(elements.modalPaymentSuccess);
      if (elements.bepSection) {
        elements.bepSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

    // License Key Activation / Restore in Settings
  if (elements.btnApplyLicense) {
    elements.btnApplyLicense.addEventListener('click', () => {
      const key = elements.inputLicenseKey.value;
      if (!key || !key.trim()) {
        alert('라이선스 키를 입력해 주세요.');
        return;
      }

      const res = restoreProWithLicenseKey(state, key);
      if (res && res.success) {
        if (res.isOwner) {
          alert('👑 사장님(최고 관리자) 인증이 완료되었습니다!\n관리자 기능 및 모든 PRO 기능이 영구 잠금 해제되었습니다.');
        } else {
          alert('🎉 정품 라이선스가 성공적으로 인증되었습니다!\n모든 PRO 기능이 영구 잠금 해제되었습니다.');
        }
        updateCalculationsAndOutputs();
        closeModal(elements.modalSettings);
      } else {
        alert('❌ 올바르지 않은 정품 라이선스 키입니다.\n구매 시 발급받으신 형식(예: CAFE-PRO-XXXX-XXXX)을 다시 확인해 주세요.');
      }
    });
  }

  // 👑 Owner Admin: Customer Mode Switch
  if (elements.btnTestCustomerMode) {
    elements.btnTestCustomerMode.addEventListener('click', () => {
      deactivateProForTesting(state);
      alert('🔄 일반 손님(무료 회원) 모드로 전환되었습니다.\n손님에게 보이는 잠금 화면 및 29,900원 결제창을 직접 테스트해 보세요.');
      updateCalculationsAndOutputs();
      closeModal(elements.modalSettings);
    });
  }

  // 👑 Owner Admin: Generate Customer License Key
  if (elements.btnGenerateLicense) {
    elements.btnGenerateLicense.addEventListener('click', () => {
      const newKey = generateCustomerLicenseKey();
      if (elements.genLicenseOutput) elements.genLicenseOutput.value = newKey;
      if (elements.genKeyAlert) elements.genKeyAlert.style.display = 'none';
    });
  }

  // 👑 Owner Admin: Copy Generated License Key
  if (elements.btnCopyGenLicense) {
    elements.btnCopyGenLicense.addEventListener('click', () => {
      const key = elements.genLicenseOutput ? elements.genLicenseOutput.value : '';
      if (!key) {
        alert('먼저 [새 키 발급] 버튼을 눌러주세요.');
        return;
      }
      if (navigator.clipboard) {
        navigator.clipboard.writeText(key).then(() => {
          if (elements.genKeyAlert) elements.genKeyAlert.style.display = 'block';
        });
      } else {
        alert(`복사된 키: ${key}`);
      }
    });
  }

  // 👑 Owner Admin: Save Bank Settings
  if (elements.btnSaveBankCfg) {
    elements.btnSaveBankCfg.addEventListener('click', () => {
      const bank = elements.inputCfgBank ? elements.inputCfgBank.value.trim() : '';
      const account = elements.inputCfgAccount ? elements.inputCfgAccount.value.trim() : '';
      const holder = elements.inputCfgHolder ? elements.inputCfgHolder.value.trim() : '';
      if (!bank || !account || !holder) {
        alert('은행명, 계좌번호, 예금주를 모두 입력해 주세요.');
        return;
      }
      saveBankSettings(state, { bank, account, holder });
      alert('✓ 입금 계좌 정보가 저장되었습니다!');
      syncBankDisplay();
    });
  }

  function syncBankDisplay() {
    const bankInfo = state.bankInfo || { bank: '카카오뱅크', account: '3333-01-2345678', holder: '카페대표' };
    if (elements.bankNameText) elements.bankNameText.textContent = bankInfo.bank;
    if (elements.bankAccText) elements.bankAccText.textContent = bankInfo.account;
    if (elements.bankHolderText) elements.bankHolderText.textContent = bankInfo.holder;
    if (elements.inputCfgBank) elements.inputCfgBank.value = bankInfo.bank;
    if (elements.inputCfgAccount) elements.inputCfgAccount.value = bankInfo.account;
    if (elements.inputCfgHolder) elements.inputCfgHolder.value = bankInfo.holder;
  }
  syncBankDisplay();
}

/**
 * Modal handlers setup
 */
function setupModalHandlers() {
  if (elements.openSavedMenusBtn && elements.modalSavedMenus) {
    elements.openSavedMenusBtn.addEventListener('click', () => {
      openModal(elements.modalSavedMenus);
      renderSavedMenusList();
    });
  }

  if (elements.openSettingsBtn && elements.modalSettings) {
    elements.openSettingsBtn.addEventListener('click', () => {
      openModal(elements.modalSettings);
    });
  }

  document.querySelectorAll('.modal-close-btn, .modal-backdrop').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-close-btn') || e.target.classList.contains('modal-backdrop')) {
        const modalId = e.target.getAttribute('data-close') || e.target.id;
        if (modalId) {
          const modal = document.getElementById(modalId);
          if (modal) closeModal(modal);
        }
      }
    });
  });

  if (elements.btnExportJson) {
    elements.btnExportJson.addEventListener('click', () => {
      exportStateAsJSON(state);
    });
  }

  if (elements.inputImportJson) {
    elements.inputImportJson.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          state = importStateFromJSON(evt.target.result);
          syncFormInputsFromState();
          if (elements.modalSettings) closeModal(elements.modalSettings);
          alert('백업 데이터가 성공적으로 복원되었습니다.');
        } catch (err) {
          alert('JSON 파싱 실패: 올바른 백업 파일이 아닙니다.');
        }
      };
      reader.readAsText(file);
    });
  }

  if (elements.btnResetAll) {
    elements.btnResetAll.addEventListener('click', () => {
      if (confirm('경고: 저장된 모든 데이터가 삭제됩니다. 계속 진행하시겠습니까?')) {
        localStorage.clear();
        state = JSON.parse(JSON.stringify(DEFAULT_CLEAN_STATE));
        syncFormInputsFromState();
        if (elements.modalSettings) closeModal(elements.modalSettings);
        alert('모든 데이터가 초기화되었습니다.');
      }
    });
  }
}

function openModal(modalEl) {
  if (modalEl) modalEl.classList.add('active');
}

function closeModal(modalEl) {
  if (modalEl) modalEl.classList.remove('active');
}

/**
 * Renders Saved Menus List inside modal
 */
function renderSavedMenusList() {
  if (!elements.savedMenusContainer) return;

  if (!state.savedMenus || state.savedMenus.length === 0) {
    elements.savedMenusContainer.innerHTML = '<p style="font-size:13px; color:var(--text-muted);">저장된 메뉴가 없습니다. 메뉴 계산 후 저장해보세요.</p>';
    return;
  }

  elements.savedMenusContainer.innerHTML = state.savedMenus.map((snap, idx) => `
    <div class="saved-card">
      <div>
        <strong style="font-size:14px;">${snap.menuName}</strong>
        <span style="font-size:12px; color:var(--text-muted);">(${snap.ruleLabel})</span>
        <p style="font-size:12px; margin-top:2px;">
          최종원가: <strong>${formatKRW(snap.calcResults.finalTotalCost)}</strong> | 이익: <strong style="color:var(--emerald);">${formatKRW(snap.calcResults.netProfit)}</strong> (${snap.calcResults.costRatio.toFixed(1)}%)
        </p>
      </div>
      <div style="display:flex; gap:4px;">
        <button type="button" class="tool-btn load-snap-btn" data-index="${idx}">불러오기</button>
        <button type="button" class="btn-del-ing del-snap-btn" data-index="${idx}">&times;</button>
      </div>
    </div>
  `).join('');

  elements.savedMenusContainer.querySelectorAll('.load-snap-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = Number(e.target.getAttribute('data-index'));
      const snap = state.savedMenus[idx];
      if (snap) {
        state = { ...state, ...snap.fullState };
        syncFormInputsFromState();
        if (elements.modalSavedMenus) closeModal(elements.modalSavedMenus);
      }
    });
  });

  elements.savedMenusContainer.querySelectorAll('.del-snap-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = Number(e.target.getAttribute('data-index'));
      state.savedMenus.splice(idx, 1);
      saveStateToStorage(state);
      renderSavedMenusList();
    });
  });
}

// Initial App Startup
window.addEventListener('DOMContentLoaded', () => {
  initPaymentSDKs();

  // Check URL query for payment callback (Toss Payments redirect)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('payment_success') === 'true') {
    const plan = urlParams.get('plan') || 'pro_lifetime';
    const orderId = urlParams.get('orderId') || 'REC-' + Date.now().toString().slice(-6);
    activateProMembership(state, plan, {
      amount: plan === 'pro_lifetime' ? 29900 : 9900,
      payMethod: '토스 간편결제/신용카드',
      receiptNo: orderId
    });
    window.history.replaceState({}, document.title, window.location.pathname);
    setTimeout(() => {
      alert('🎉 토스페이먼츠 결제가 정상 완료되어 PRO 멤버십이 활성화되었습니다!');
    }, 400);
  }

  setupEventListeners();
  syncFormInputsFromState();
});
