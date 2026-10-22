/**
 * 카페 원가계산기 - PRO Export & Report Generator
 * (엑셀 CSV 다운로드 및 A4 공식 원가 분석 보고서 인쇄 모듈)
 */

import { formatCommaNumber } from './calculator.js';

/**
 * Downloads full cost breakdown as Microsoft Excel CSV file (with UTF-8 BOM)
 */
export function downloadCostExcel(state, calc) {
  const menuName = state.menuName || '카페메뉴';
  const fileName = `${menuName}_원가분석보고서_${new Date().toISOString().slice(0, 10)}.csv`;

  const rows = [
    ['[카페 메뉴 실질 원가 분석 보고서]'],
    ['생성일시', new Date().toLocaleString('ko-KR')],
    ['메뉴명', menuName],
    ['음료 온도', state.temp],
    ['이용 형태', state.serviceType === 'STORE' ? '매장' : '테이크아웃'],
    ['판매 가격', `${formatCommaNumber(calc.sellingPrice)}원`],
    [''],
    ['[1. 1잔 직접원가 요약]'],
    ['항목', '금액(원)', '구성비율(%)'],
    ['음료 재료비', Math.round(calc.ingredientCost), `${((calc.ingredientCost / (calc.finalTotalCost || 1)) * 100).toFixed(1)}%`],
    ['포장·소모품비', Math.round(calc.packagingCost), `${((calc.packagingCost / (calc.finalTotalCost || 1)) * 100).toFixed(1)}%`],
    ['기타 변동비', Math.round(calc.extraCost), `${((calc.extraCost / (calc.finalTotalCost || 1)) * 100).toFixed(1)}%`],
    ['결제 수수료', Math.round(calc.paymentFee), `${((calc.paymentFee / (calc.finalTotalCost || 1)) * 100).toFixed(1)}%`],
    ['1잔 직접원가 소계', Math.round(calc.directCostPerCup), '100%'],
    [''],
    ['[2. 음료 재료 상세 명세]'],
    ['재료명', '구입가격(원)', '구입수량', '단위', '1잔사용량', '1잔사용원가(원)']
  ];

  if (state.ingredients && state.ingredients.length > 0) {
    state.ingredients.forEach(ing => {
      const unitCost = ing.qty > 0 ? (ing.price / ing.qty) * ing.usage : 0;
      rows.push([
        ing.name,
        formatCommaNumber(ing.price),
        formatCommaNumber(ing.qty),
        ing.unit,
        ing.usage,
        Math.round(unitCost)
      ]);
    });
  } else {
    rows.push(['등록된 재료 없음', '0', '0', '-', '0', '0']);
  }

  rows.push(['']);
  rows.push(['[3. 포장재 적용 명세]']);
  rows.push(['포장재 항목', '적용 여부', '1개당 단가(원)']);
  if (calc.packRes && calc.packRes.appliedItemsList) {
    calc.packRes.appliedItemsList.forEach(item => {
      rows.push([
        item.name,
        item.isApplied ? '포함' : '제외',
        item.unitCost.toFixed(1)
      ]);
    });
  }

  rows.push(['']);
  rows.push(['[4. 최종 수익성 및 손익분기점(BEP) 분석]']);
  rows.push(['판매가격', `${formatCommaNumber(calc.sellingPrice)}원`]);
  rows.push(['최종 1잔 원가', `${formatCommaNumber(Math.round(calc.finalTotalCost))}원`]);
  rows.push(['1잔당 순마진(이익)', `${formatCommaNumber(Math.round(calc.netProfit))}원`]);
  rows.push(['원가율', `${calc.costRatio.toFixed(1)}%`]);
  rows.push(['마진율(이익률)', `${calc.profitRatio.toFixed(1)}%`]);
  if (calc.bep && calc.bep.isFeasible) {
    rows.push(['월 손익분기점 판매량', `${formatCommaNumber(calc.bep.bepCupsMonth)}잔 / 월`]);
    rows.push(['일일 손익분기점 판매량', `${formatCommaNumber(calc.bep.bepCupsDay)}잔 / 일 (하루 최소 판매잔수)`]);
    rows.push(['손익분기 월 매출', `${formatCommaNumber(calc.bep.bepRevenueMonth)}원`]);
  }

  // Convert to CSV with UTF-8 BOM
  const csvContent = '\uFEFF' + rows.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * Triggers standard clean browser print for A4 cost report
 */
export function printCostReport() {
  window.print();
}
