import type { LoanInputs, LoanYearRow } from "./types";

/**
 * Yıllık eşit taksitli (anuite) kredi amortisman tablosu.
 *
 * Yıllık taksit:  A = P · i / (1 - (1+i)^-n)
 * (i: yıllık faiz, n: vade yıl, P: anapara)
 */
export function loanSchedule(loan: LoanInputs): LoanYearRow[] {
  const { principal, annualRate, termYears } = loan;
  if (principal <= 0 || termYears <= 0) return [];

  const i = annualRate;
  const annuity =
    i === 0
      ? principal / termYears
      : (principal * i) / (1 - Math.pow(1 + i, -termYears));

  const rows: LoanYearRow[] = [];
  let balance = principal;
  for (let year = 1; year <= termYears; year++) {
    const interest = balance * i;
    let principalPaid = annuity - interest;
    // Son yıl yuvarlama artıklarını kapat
    if (year === termYears) principalPaid = balance;
    const payment = interest + principalPaid;
    const closing = Math.max(0, balance - principalPaid);
    rows.push({
      year,
      openingBalance: round2(balance),
      payment: round2(payment),
      interest: round2(interest),
      principal: round2(principalPaid),
      closingBalance: round2(closing),
    });
    balance = closing;
  }
  return rows;
}

/** Yıllık eşit taksit tutarı. */
export function annuityPayment(loan: LoanInputs): number {
  const { principal, annualRate, termYears } = loan;
  if (termYears <= 0) return 0;
  if (annualRate === 0) return principal / termYears;
  return (principal * annualRate) / (1 - Math.pow(1 + annualRate, -termYears));
}

/**
 * DSCR (Debt Service Coverage Ratio) = İşletme net nakit akışı / borç servisi.
 * Banka tipik eşik: ≥ 1.20. Her yıl için dizi döner.
 */
export function dscrByYear(
  operatingCashFlowByYear: number[],
  loanSched: LoanYearRow[],
): number[] {
  return loanSched.map((row, idx) => {
    const ocf = operatingCashFlowByYear[idx] ?? 0;
    return row.payment > 0 ? ocf / row.payment : Infinity;
  });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
