import { apiFetch, isApiEnabled, readErrorMessage } from './apiClient'
import type { ExpenseLine, ExpenseLineCategory, MonthKey } from './monthProfitReport'

export type MonthExpenseLines = {
  monthKey: MonthKey
  lines: ExpenseLine[]
  total: number
}

export function isExpenseLinesApiEnabled(): boolean {
  return isApiEnabled()
}

function normalizeLine(
  raw: Partial<ExpenseLine>,
  monthKey: MonthKey,
  index: number,
): ExpenseLine {
  return {
    id: raw.id,
    monthKey: raw.monthKey ?? monthKey,
    category: (raw.category ?? 'alte') as ExpenseLineCategory,
    label: raw.label ?? '',
    amount: Number(raw.amount) || 0,
    sortOrder: Number(raw.sortOrder) ?? index,
  }
}

export async function fetchMonthExpenseLines(
  monthKey: MonthKey,
): Promise<MonthExpenseLines> {
  const res = await apiFetch(
    `/monthly_expense_lines.php?month=${encodeURIComponent(monthKey)}`,
    {},
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
  const data = (await res.json()) as MonthExpenseLines
  const lines = Array.isArray(data.lines)
    ? data.lines.map((line, index) =>
        normalizeLine(line, monthKey, index),
      )
    : []
  return {
    monthKey: data.monthKey || monthKey,
    lines,
    total: Number(data.total) || lines.reduce((s, l) => s + l.amount, 0),
  }
}

export async function saveMonthExpenseLines(input: {
  monthKey: MonthKey
  lines: ExpenseLine[]
}): Promise<MonthExpenseLines> {
  const res = await apiFetch(
    '/monthly_expense_lines.php',
    {
      method: 'POST',
      body: JSON.stringify({
        monthKey: input.monthKey,
        lines: input.lines.map((line, index) => ({
          category: line.category,
          label: line.label,
          amount: line.amount,
          sortOrder: index,
        })),
      }),
    },
    { credentials: 'include' },
  )
  if (!res.ok) {
    throw new Error(await readErrorMessage(res))
  }
  const data = (await res.json()) as MonthExpenseLines
  const lines = Array.isArray(data.lines)
    ? data.lines.map((line, index) =>
        normalizeLine(line, input.monthKey, index),
      )
    : []
  return {
    monthKey: data.monthKey || input.monthKey,
    lines,
    total: Number(data.total) || lines.reduce((s, l) => s + l.amount, 0),
  }
}

export function emptyExpenseLine(
  monthKey: MonthKey,
  sortOrder: number,
): ExpenseLine {
  return {
    monthKey,
    category: 'alte',
    label: '',
    amount: 0,
    sortOrder,
  }
}
