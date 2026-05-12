import { useEffect, useState } from "react";
import { Building2, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import AppLayout from "../../../features/layout/components/app-layout";
import {
  createFornecedor,
  deleteFornecedor,
  listFornecedores,
  updateFornecedor,
  type CreateFornecedorPayload,
  type Fornecedor,
} from "../../../features/financeiro/services/fornecedores";
import { listFinanceEntries, type FinanceEntry } from "../../../features/financeiro/services/financeiro";
import { expenseCategories, type ExpenseCategory, formatCurrency } from "../utils/finance-calc";

const inputCls =
  "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";
const labelCls = "grid gap-2 text-sm font-medium text-slate-700";

const EMPTY_FORM: CreateFornecedorPayload = {
  nome: "",
  cnpj: "",
  categoria: "Outros",
  telefone: "",
  email: "",
  notes: "",
};

type ModalMode = "create" | "edit" | null;

export default function FornecedoresPage() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showInativos, setShowInativos] = useState(false);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editing, setEditing] = useState<Fornecedor | null>(null);
  const [form, setForm] = useState<CreateFornecedorPayload>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [histFornecedor, setHistFornecedor] = useState<Fornecedor | null>(null);
  const [histEntries, setHistEntries] = useState<FinanceEntry[]>([]);
  const [histLoading, setHistLoading] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setFornecedores(await listFornecedores(false));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar fornecedores.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function openHistory(f: Fornecedor) {
    setHistFornecedor(f);
    setHistLoading(true);
    try {
      const all = await listFinanceEntries();
      setHistEntries(
        all.filter(
          (e) =>
            e.type === "EXPENSE" &&
            e.counterparty.toLowerCase().includes(f.nome.toLowerCase()),
        ),
      );
    } catch {
      setHistEntries([]);
    } finally {
      setHistLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setModalMode("create");
  }

  function openEdit(f: Fornecedor) {
    setEditing(f);
    setForm({
      nome: f.nome,
      cnpj: f.cnpj ?? "",
      categoria: f.categoria,
      telefone: f.telefone ?? "",
      email: f.email ?? "",
      notes: f.notes ?? "",
    });
    setFormError("");
    setModalMode("edit");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) { setFormError("Nome é obrigatório."); return; }
    setFormError("");
    setSaving(true);
    try {
      if (modalMode === "edit" && editing) {
        await updateFornecedor(editing.id, { ...form, nome: form.nome.trim() });
      } else {
        await createFornecedor({ ...form, nome: form.nome.trim() });
      }
      setModalMode(null);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleAtivo(f: Fornecedor) {
    try {
      await updateFornecedor(f.id, { ativo: !f.ativo });
      await load();
    } catch {
      setError("Erro ao alterar status do fornecedor.");
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteFornecedor(id);
      await load();
    } catch {
      setError("Não é possível excluir um fornecedor vinculado a despesas.");
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = fornecedores.filter((f) => {
    if (!showInativos && !f.ativo) return false;
    if (search && !f.nome.toLowerCase().includes(search.toLowerCase()) && !(f.cnpj ?? "").includes(search)) return false;
    return true;
  });

  const histTotal = histEntries.reduce((s, e) => s + e.amount, 0);

  return (
    <AppLayout title="Fornecedores">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Fornecedores</h1>
            <p className="mt-1 text-sm text-slate-500">Gerencie os prestadores de serviço do condomínio.</p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            <Plus size={16} />
            Novo fornecedor
          </button>
        </div>

        {error && (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou CNPJ..."
              className="h-10 w-full rounded-2xl border border-slate-200 bg-white pl-9 pr-4 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input type="checkbox" checked={showInativos} onChange={(e) => setShowInativos(e.target.checked)} className="accent-indigo-600" />
            Mostrar inativos
          </label>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 size={24} className="animate-spin mr-2" />
            Carregando...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center">
            <Building2 size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">Nenhum fornecedor encontrado.</p>
            <button onClick={openCreate} className="mt-3 text-sm font-semibold text-indigo-600 hover:underline">Adicionar o primeiro</button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nome</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hidden sm:table-cell">Categoria</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hidden md:table-cell">CNPJ</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hidden lg:table-cell">Contato</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((f) => (
                  <tr key={f.id} className={`group transition hover:bg-slate-50/60 ${!f.ativo ? "opacity-50" : ""}`}>
                    <td className="px-5 py-3.5">
                      <button
                        type="button"
                        onClick={() => void openHistory(f)}
                        className="font-semibold text-slate-800 hover:text-indigo-600 transition text-left"
                      >
                        {f.nome}
                      </button>
                      {!f.ativo && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-400">INATIVO</span>}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 hidden sm:table-cell">{f.categoria}</td>
                    <td className="px-5 py-3.5 text-slate-500 hidden md:table-cell">{f.cnpj || <span className="text-slate-300">—</span>}</td>
                    <td className="px-5 py-3.5 text-slate-500 hidden lg:table-cell">
                      {f.email || f.telefone
                        ? <span>{f.email}{f.email && f.telefone ? " · " : ""}{f.telefone}</span>
                        : <span className="text-slate-300">—</span>
                      }
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => void openHistory(f)}
                          className="rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                        >
                          Histórico
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(f)}
                          className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleToggleAtivo(f)}
                          className="rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                        >
                          {f.ativo ? "Inativar" : "Ativar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(f.id)}
                          disabled={deletingId === f.id}
                          className="rounded-xl p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-lg rounded-[28px] bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Fornecedores</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">
                  {modalMode === "edit" ? "Editar fornecedor" : "Novo fornecedor"}
                </h3>
              </div>
              <button type="button" onClick={() => setModalMode(null)} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-400 hover:bg-slate-50 transition">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={(e) => void handleSave(e)} className="p-6 grid gap-4">
              {formError && (
                <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{formError}</p>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className={labelCls}>
                  <span>Nome <span className="text-rose-500">*</span></span>
                  <input value={form.nome} onChange={(e) => setForm((c) => ({ ...c, nome: e.target.value }))} placeholder="Ex.: LimpaForte Serviços" className={inputCls} />
                </label>
                <label className={labelCls}>
                  <span>CNPJ</span>
                  <input value={form.cnpj ?? ""} onChange={(e) => setForm((c) => ({ ...c, cnpj: e.target.value }))} placeholder="00.000.000/0001-00" className={inputCls} />
                </label>
              </div>

              <label className={labelCls}>
                <span>Categoria padrão</span>
                <select value={form.categoria} onChange={(e) => setForm((c) => ({ ...c, categoria: e.target.value as ExpenseCategory }))} className={inputCls}>
                  {expenseCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className={labelCls}>
                  <span>Telefone</span>
                  <input value={form.telefone ?? ""} onChange={(e) => setForm((c) => ({ ...c, telefone: e.target.value }))} placeholder="(11) 99999-9999" className={inputCls} />
                </label>
                <label className={labelCls}>
                  <span>Email</span>
                  <input type="email" value={form.email ?? ""} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} placeholder="contato@fornecedor.com" className={inputCls} />
                </label>
              </div>

              <label className={labelCls}>
                <span>Observações</span>
                <textarea
                  value={form.notes ?? ""}
                  onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))}
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                />
              </label>

              <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setModalMode(null)} className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition">
                  <Plus size={16} />
                  {saving ? "Salvando..." : modalMode === "edit" ? "Salvar alterações" : "Criar fornecedor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Drawer */}
      {histFornecedor && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="fixed inset-0 bg-black/20" onClick={() => setHistFornecedor(null)} />
          <div className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col h-full">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Histórico de despesas</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">{histFornecedor.nome}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{histFornecedor.categoria}{histFornecedor.cnpj ? ` · ${histFornecedor.cnpj}` : ""}</p>
              </div>
              <button type="button" onClick={() => setHistFornecedor(null)} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-400 hover:bg-slate-50 transition">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex gap-6 text-sm">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Total pago</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(histTotal)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Lançamentos</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{histEntries.length}</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {histLoading ? (
                <div className="flex items-center justify-center py-12 text-slate-400">
                  <Loader2 size={20} className="animate-spin mr-2" />
                  Carregando...
                </div>
              ) : histEntries.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">Nenhuma despesa encontrada para este fornecedor.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {histEntries.map((entry) => (
                    <div key={entry.id} className="px-6 py-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{entry.description}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{entry.category} · {entry.reference_date} · {entry.payment_method}</p>
                        <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${entry.status === "Pago" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                          {entry.status}
                        </span>
                      </div>
                      <p className="shrink-0 text-sm font-bold text-slate-900">{formatCurrency(entry.amount)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
