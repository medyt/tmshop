import { apiFetch, isApiEnabled, readErrorMessage } from './apiClient'

export type MonthlyExpenses = {
  monthKey: string
  facebookAds: number
  consumables: number
  consulting: number
  salaries: number
  total: number
}

export type YearlyExpenses = {
  year: string
  months: MonthlyExpenses[]
}

export function emptyMonthlyExpenses(monthKey: string): MonthlyExpenses {
  return {
    monthKey,
    facebookAds: 0,
    consumables: 0,
    consulting: 0,
    salaries: 0,
    total: 0,
  }
}

function normalizeMonthlyExpenses(
  data: Partial<MonthlyExpenses>,
  monthKey: string,
): MonthlyExpenses {
  const facebookAds = Number(data.facebookAds) || 0
  const consumables = Number(data.consumables) || 0
  const consulting = Number(data.consulting) || 0
  const salaries = Number(data.salaries) || 0
  return {
    monthKey: data.monthKey || monthKey,
    facebookAds,
    consumables,
    consulting,
    salaries,
    total:
      Number(data.total) ||
      facebookAds + consumables + consulting + salaries,
  }
}

export function isMonthlyExpensesApiEnabled(): boolean {
  return isApiEnabled()
}

export async function fetchMonthlyExpenses(
  monthKey: string,
): Promise<MonthlyExpenses> {
  const res = await apiFetch(
    `/monthly_expenses.php?month=${encodeURIComponent(monthKey)}`,
    {},
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
  const data = (await res.json()) as MonthlyExpenses
  return normalizeMonthlyExpenses(data, monthKey)
}

export async function fetchYearlyExpenses(
  year: number,
): Promise<YearlyExpenses> {
  const res = await apiFetch(
    `/monthly_expenses.php?year=${encodeURIComponent(String(year))}`,
    {},
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
  const data = (await res.json()) as YearlyExpenses
  const months = Array.isArray(data.months)
    ? data.months.map((row, index) =>
        normalizeMonthlyExpenses(
          row,
          `${year}-${String(index + 1).padStart(2, '0')}`,
        ),
      )
    : Array.from({ length: 12 }, (_, index) =>
        emptyMonthlyExpenses(
          `${year}-${String(index + 1).padStart(2, '0')}`,
        ),
      )
  return {
    year: String(data.year ?? year),
    months,
  }
}

export async function saveMonthlyExpenses(input: {
  monthKey: string
  facebookAds: number
  consumables: number
  consulting: number
  salaries: number
}): Promise<MonthlyExpenses> {
  const res = await apiFetch(
    '/monthly_expenses.php',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
  const data = (await res.json()) as MonthlyExpenses
  return normalizeMonthlyExpenses(data, input.monthKey)
}
