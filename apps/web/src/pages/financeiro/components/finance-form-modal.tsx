import { PlusCircle, Receipt, X } from "lucide-react";
import type {
  RevenueCategory,
  ExpenseCategory,
  RevenueStatus,
  UnitOption,
} from "../utils/finance-calc";
import { revenueCategories, expenseCategories } from "../utils/finance-calc";

type FinanceModal = "revenue" | "expense" | "bill" | null;

export type RevenueForm = {
  identifier: string; description: string; amount: string; referenceDate: string;
  unit: string; resident: string; category: RevenueCategory; paymentMethod: string;
  status: RevenueStatus; documentName: string; notes: string;
};

export type ExpenseForm = {
  identifier: string; description: string; amount: string; referenceDate: string;
  dueDate: string; counterparty: string; category: ExpenseCategory; paymentMethod: string;
  status: string; documentName: string; notes: string;
};

export type BillForm = {
  unit: string; resident: string; residentEmail: string; amount: string;
  competenceDate: string; issueDate: string; dueDate: string; instructions: string;
};

const inputClass =
  "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100";
const fieldLabelClass = "grid gap-2 text-sm font-medium text-slate-700";

type Props = {
  activeModal: FinanceModal;
  formError: string;
  revenueForm: RevenueForm;
  setRevenueForm: React.Dispatch<React.SetStateAction<RevenueForm>>;
  revenueErrors: Record<string, string>;
  expenseForm: ExpenseForm;
  setExpenseForm: React.Dispatch<React.SetStateAction<ExpenseForm>>;
  billForm: BillForm;
  setBillForm: React.Dispatch<React.SetStateAction<BillForm>>;
  unitOptions: UnitOption[];
  savingRevenue: boolean;
  onClose: () => void;
  onCreateRevenue: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onCreateExpense: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onIssueBill: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
};

export function FinanceFormModal({
  activeModal, formError,
  revenueForm, setRevenueForm, revenueErrors,
  expenseForm, setExpenseForm,
  billForm, setBillForm,
  unitOptions, savingRevenue,
  onClose, onCreateRevenue, onCreateExpense, onIssueBill,
}: Props) {
  if (!activeModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-2xl rounded-[32px] bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Financeiro</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">
              {activeModal === "revenue" ? "Cadastrar receita" : activeModal === "expense" ? "Cadastrar despesa" : "Emitir boleto mockado"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {activeModal === "bill"
                ? "Gere a cobranca condominial com linha digitavel e segunda via interna."
                : "Preencha os dados da movimentacao financeira."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          {formError && (
            <p className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {formError}
            </p>
          )}

          {activeModal === "revenue" && (
            <form onSubmit={(e) => void onCreateRevenue(e)} className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={fieldLabelClass}>
                  <span>Codigo</span>
                  <input
                    value={revenueForm.identifier}
                    onChange={(e) => setRevenueForm((c) => ({ ...c, identifier: e.target.value }))}
                    placeholder="Ex.: REC-0426-001"
                    className={`${inputClass} ${revenueErrors.identifier ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : ""}`}
                  />
                  {revenueErrors.identifier && <span className="text-xs text-rose-600">{revenueErrors.identifier}</span>}
                </label>
                <label className={fieldLabelClass}>
                  <span>Valor</span>
                  <input
                    type="number" min={0} step="0.01"
                    value={revenueForm.amount}
                    onChange={(e) => setRevenueForm((c) => ({ ...c, amount: e.target.value }))}
                    placeholder="0,00"
                    className={`${inputClass} ${revenueErrors.amount ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : ""}`}
                  />
                  {revenueErrors.amount && <span className="text-xs text-rose-600">{revenueErrors.amount}</span>}
                </label>
              </div>

              <label className={fieldLabelClass}>
                <span>Descricao</span>
                <input
                  value={revenueForm.description}
                  onChange={(e) => setRevenueForm((c) => ({ ...c, description: e.target.value }))}
                  placeholder="Ex.: Aluguel do salao"
                  className={`${inputClass} ${revenueErrors.description ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : ""}`}
                />
                {revenueErrors.description && <span className="text-xs text-rose-600">{revenueErrors.description}</span>}
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className={fieldLabelClass}>
                  <span>Data de referencia</span>
                  <input
                    type="date"
                    value={revenueForm.referenceDate}
                    onChange={(e) => setRevenueForm((c) => ({ ...c, referenceDate: e.target.value }))}
                    className={`${inputClass} ${revenueErrors.referenceDate ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : ""}`}
                  />
                  {revenueErrors.referenceDate && <span className="text-xs text-rose-600">{revenueErrors.referenceDate}</span>}
                </label>
                <label className={fieldLabelClass}>
                  <span>Categoria</span>
                  <select
                    value={revenueForm.category}
                    onChange={(e) => setRevenueForm((c) => ({ ...c, category: e.target.value as RevenueCategory }))}
                    className={inputClass}
                  >
                    {revenueCategories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className={fieldLabelClass}>
                <span>Unidade</span>
                <select
                  value={revenueForm.unit}
                  onChange={(e) => {
                    const unit = unitOptions.find((item) => item.value === e.target.value);
                    setRevenueForm((c) => ({ ...c, unit: e.target.value, resident: unit?.resident ?? c.resident }));
                  }}
                  className={inputClass}
                >
                  <option value="">Selecione a unidade</option>
                  {unitOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className={fieldLabelClass}>
                  <span>Morador</span>
                  <input
                    value={revenueForm.resident}
                    onChange={(e) => setRevenueForm((c) => ({ ...c, resident: e.target.value }))}
                    placeholder="Nome do morador"
                    className={inputClass}
                  />
                </label>
                <label className={fieldLabelClass}>
                  <span>Status</span>
                  <select
                    value={revenueForm.status}
                    onChange={(e) => setRevenueForm((c) => ({ ...c, status: e.target.value as RevenueStatus }))}
                    className={inputClass}
                  >
                    <option value="Recebido">Recebido</option>
                    <option value="Em aberto">Em aberto</option>
                    <option value="Atrasado">Atrasado</option>
                  </select>
                </label>
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={onClose} className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" disabled={savingRevenue} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60">
                  <PlusCircle size={16} />
                  {savingRevenue ? "Salvando..." : "Salvar receita"}
                </button>
              </div>
            </form>
          )}

          {activeModal === "expense" && (
            <form onSubmit={(e) => void onCreateExpense(e)} className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={fieldLabelClass}>
                  <span>Codigo</span>
                  <input
                    value={expenseForm.identifier}
                    onChange={(e) => setExpenseForm((c) => ({ ...c, identifier: e.target.value }))}
                    placeholder="Ex.: DESP-0426-001"
                    className={inputClass}
                  />
                </label>
                <label className={fieldLabelClass}>
                  <span>Valor</span>
                  <input
                    type="number" min={0} step="0.01"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm((c) => ({ ...c, amount: e.target.value }))}
                    placeholder="0,00"
                    className={inputClass}
                  />
                </label>
              </div>

              <label className={fieldLabelClass}>
                <span>Descricao</span>
                <input
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm((c) => ({ ...c, description: e.target.value }))}
                  placeholder="Ex.: Conta de energia"
                  className={inputClass}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className={fieldLabelClass}>
                  <span>Data de referencia</span>
                  <input type="date" value={expenseForm.referenceDate} onChange={(e) => setExpenseForm((c) => ({ ...c, referenceDate: e.target.value }))} className={inputClass} />
                </label>
                <label className={fieldLabelClass}>
                  <span>Vencimento</span>
                  <input type="date" value={expenseForm.dueDate} onChange={(e) => setExpenseForm((c) => ({ ...c, dueDate: e.target.value }))} className={inputClass} />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className={fieldLabelClass}>
                  <span>Fornecedor</span>
                  <input value={expenseForm.counterparty} onChange={(e) => setExpenseForm((c) => ({ ...c, counterparty: e.target.value }))} placeholder="Nome do fornecedor" className={inputClass} />
                </label>
                <label className={fieldLabelClass}>
                  <span>Categoria</span>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm((c) => ({ ...c, category: e.target.value as ExpenseCategory }))}
                    className={inputClass}
                  >
                    {expenseCategories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={onClose} className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-600">
                  <PlusCircle size={16} />
                  Salvar despesa
                </button>
              </div>
            </form>
          )}

          {activeModal === "bill" && (
            <form onSubmit={(e) => void onIssueBill(e)} className="grid gap-4">
              <label className={fieldLabelClass}>
                <span>Unidade</span>
                <select
                  value={billForm.unit}
                  onChange={(e) => {
                    const option = unitOptions.find((item) => item.value === e.target.value);
                    setBillForm((c) => ({
                      ...c,
                      unit: e.target.value,
                      resident: option?.resident ?? c.resident,
                      residentEmail: option?.email ?? c.residentEmail,
                    }));
                  }}
                  className={inputClass}
                >
                  <option value="">Selecione a unidade</option>
                  {unitOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className={fieldLabelClass}>
                  <span>Morador</span>
                  <input value={billForm.resident} onChange={(e) => setBillForm((c) => ({ ...c, resident: e.target.value }))} placeholder="Nome do morador" className={inputClass} />
                </label>
                <label className={fieldLabelClass}>
                  <span>Email do morador</span>
                  <input type="email" value={billForm.residentEmail} onChange={(e) => setBillForm((c) => ({ ...c, residentEmail: e.target.value }))} placeholder="morador@exemplo.com" className={inputClass} />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className={fieldLabelClass}>
                  <span>Valor</span>
                  <input type="number" min={0} step="0.01" value={billForm.amount} onChange={(e) => setBillForm((c) => ({ ...c, amount: e.target.value }))} placeholder="0,00" className={inputClass} />
                </label>
                <label className={fieldLabelClass}>
                  <span>Competencia</span>
                  <input type="date" value={billForm.competenceDate} onChange={(e) => setBillForm((c) => ({ ...c, competenceDate: e.target.value }))} className={inputClass} />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className={fieldLabelClass}>
                  <span>Emissao</span>
                  <input type="date" value={billForm.issueDate} onChange={(e) => setBillForm((c) => ({ ...c, issueDate: e.target.value }))} className={inputClass} />
                </label>
                <label className={fieldLabelClass}>
                  <span>Vencimento</span>
                  <input type="date" value={billForm.dueDate} onChange={(e) => setBillForm((c) => ({ ...c, dueDate: e.target.value }))} className={inputClass} />
                </label>
              </div>

              <label className={fieldLabelClass}>
                <span>Instrucoes</span>
                <textarea
                  value={billForm.instructions}
                  placeholder="Ex.: Nao receber apos 30 dias do vencimento."
                  onChange={(e) => setBillForm((c) => ({ ...c, instructions: e.target.value }))}
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                />
              </label>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={onClose} className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
                  <Receipt size={16} />
                  Emitir boleto
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
