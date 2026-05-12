import { useEffect, useMemo, useState } from "react";
import { Car, Heart, Home, Mail, Phone, Plus, Trash2, UserRound, X } from "lucide-react";
import { getUser } from "../../auth/services/auth";
import { fetchBuilding, fetchUsers } from "../services/predio";
import type { Apartment } from "../services/predio";

type UserOption = { id: string; name: string; email: string };

export function MoradorModal({
  apartment,
  onClose,
  onAssign,
  onDeleteApartment,
}: {
  apartment: Apartment | null;
  onClose: () => void;
  onAssign?: (apartmentId: string, userId: string | null) => Promise<void>;
  onDeleteApartment?: (apartment: Apartment) => Promise<void>;
}) {
  const user = useMemo(() => getUser(), []);
  const isAdmin = user?.role === "ADMIN";
  const residents = apartment?.residents ?? (apartment?.resident ? [apartment.resident] : []);
  const activeVisitors = apartment?.activeVisitors ?? [];
  const apartmentId = apartment?.id ?? null;

  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  // set of user IDs already assigned to ANY apartment
  const [assignedUserIds, setAssignedUserIds] = useState<Set<string>>(new Set());
  const [loadingUsers, setLoadingUsers] = useState(false);

  // extra slots the admin added (not yet saved)
  const [pendingSlots, setPendingSlots] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPendingSlots([]);
    setError(null);
  }, [apartment?.id]);

  useEffect(() => {
    if (!isAdmin) return;
    setLoadingUsers(true);
    Promise.all([fetchUsers(), fetchBuilding()])
      .then(([users, building]) => {
        setAllUsers(users);
        const occupied = new Set<string>();
        for (const floor of building) {
          for (const apt of floor.apartments) {
            for (const r of apt.residents) {
              if (r.id) occupied.add(r.id);
            }
          }
        }
        setAssignedUserIds(occupied);
      })
      .catch(() => {})
      .finally(() => setLoadingUsers(false));
  }, [isAdmin, apartment?.id]);

  // users available to pick: not already assigned elsewhere
  const freeUsers = useMemo(() => {
    const currentResidentIds = new Set(residents.map((r) => r.id).filter(Boolean));
    return allUsers.filter((u) => !assignedUserIds.has(u.id) || currentResidentIds.has(u.id));
  }, [allUsers, assignedUserIds, residents]);

  // options not yet chosen in this modal (across existing residents + pending slots)
  function availableFor(slotValue: string): UserOption[] {
    const takenIds = new Set([
      ...residents.map((r) => r.id).filter(Boolean),
      ...pendingSlots.filter((s) => s && s !== slotValue),
    ]);
    return freeUsers.filter((u) => !takenIds.has(u.id) || u.id === slotValue);
  }

  async function handleRemoveResident(residentId: string | undefined) {
    if (!onAssign || !apartmentId || !residentId) return;
    setSaving(true);
    setError(null);
    try {
      await onAssign(apartmentId, null);
    } catch (err: any) {
      setError(err?.message ?? "Erro ao remover vínculo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveSlot(userId: string) {
    if (!onAssign || !apartmentId || !userId) return;
    setSaving(true);
    setError(null);
    try {
      await onAssign(apartmentId, userId);
      setPendingSlots((s) => s.filter((x) => x !== userId));
    } catch (err: any) {
      setError(err?.message ?? "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteApartment() {
    if (!apartment || !onDeleteApartment) return;
    setSaving(true);
    setError(null);
    try {
      await onDeleteApartment(apartment);
    } catch (err: any) {
      setError(err?.message ?? "Erro ao excluir apartamento.");
    } finally {
      setSaving(false);
    }
  }

  if (!apartment) return null;

  const selectCls =
    "w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100";

  return (
    <div
      className="fixed inset-0 z-200 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-gray-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 rounded-t-3xl bg-white px-6 pt-6 pb-4 border-b border-slate-100">
          <div>
            <div className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              Unidade selecionada
            </div>
            <h3 className="mt-2 text-xl font-semibold text-gray-900">Apartamento {apartment.number}</h3>
            <p className="mt-0.5 text-sm text-gray-500">Andar {apartment.floor}</p>
          </div>
          <button
            className="mt-1 rounded-xl bg-transparent p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* ── Moradores vinculados ── */}
          {residents.length > 0 ? (
            <div className="space-y-3">
              {residents.map((r, idx) => (
                <div
                  key={r.id ?? idx}
                  className="overflow-hidden rounded-2xl border border-indigo-100 bg-linear-to-br from-indigo-50 to-white"
                >
                  {/* Resident header */}
                  <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-indigo-100/60">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                        <UserRound size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{r.name}</p>
                        <p className="text-xs text-gray-500">{r.status}</p>
                      </div>
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => void handleRemoveResident(r.id)}
                        disabled={saving}
                        title="Desvincular"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-white text-rose-500 transition hover:bg-rose-50 disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  {/* Info table */}
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-indigo-100/50">
                      <tr>
                        <td className="w-1/2 px-4 py-2.5">
                          <div className="flex items-center gap-2 text-xs text-slate-500 mb-0.5"><Mail size={12} />E-mail</div>
                          <p className="font-medium text-slate-800 truncate">{r.email || "—"}</p>
                        </td>
                        <td className="w-1/2 px-4 py-2.5 border-l border-indigo-100/50">
                          <div className="flex items-center gap-2 text-xs text-slate-500 mb-0.5"><Phone size={12} />Telefone</div>
                          <p className="font-medium text-slate-800">{r.phone || "—"}</p>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2 text-xs text-slate-500 mb-0.5"><Home size={12} />Apartamento</div>
                          <p className="font-medium text-slate-800">{apartment.number}</p>
                        </td>
                        <td className="px-4 py-2.5 border-l border-indigo-100/50">
                          <div className="flex items-center gap-2 text-xs text-slate-500 mb-0.5"><UserRound size={12} />Status</div>
                          <p className="font-medium text-slate-800">{r.status}</p>
                        </td>
                      </tr>
                      {(r.carPlate || typeof r.petsCount === "number") && (
                        <tr>
                          {r.carPlate ? (
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2 text-xs text-slate-500 mb-0.5"><Car size={12} />Placa</div>
                              <p className="font-medium text-slate-800">{r.carPlate}</p>
                            </td>
                          ) : <td />}
                          {typeof r.petsCount === "number" ? (
                            <td className="px-4 py-2.5 border-l border-indigo-100/50">
                              <div className="flex items-center gap-2 text-xs text-slate-500 mb-0.5"><Heart size={12} />Pets</div>
                              <p className="font-medium text-slate-800">{r.petsCount}</p>
                            </td>
                          ) : <td />}
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-8 text-center">
              <p className="text-sm font-semibold text-gray-700">Apartamento vazio</p>
              <p className="mt-1 text-xs text-gray-400">Nenhum morador vinculado a esta unidade.</p>
            </div>
          )}

          {/* ── Pending new slots ── */}
          {isAdmin && pendingSlots.map((slotVal, idx) => (
            <div key={idx} className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
              <p className="text-xs font-semibold text-indigo-700 mb-2">Novo morador</p>
              <div className="flex items-center gap-2">
                <select
                  value={slotVal}
                  onChange={(e) => setPendingSlots((s) => s.map((v, i) => i === idx ? e.target.value : v))}
                  disabled={loadingUsers}
                  className={selectCls}
                >
                  <option value="">
                    {loadingUsers ? "Carregando..." : "Selecionar usuário..."}
                  </option>
                  {availableFor(slotVal).map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void handleSaveSlot(slotVal)}
                  disabled={saving || !slotVal}
                  className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  {saving ? "..." : "Salvar"}
                </button>
                <button
                  type="button"
                  onClick={() => setPendingSlots((s) => s.filter((_, i) => i !== idx))}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          ))}

          {/* ── Add resident button ── */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setPendingSlots((s) => [...s, ""])}
              disabled={loadingUsers}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-indigo-300 bg-indigo-50/50 py-3 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50 disabled:opacity-50"
            >
              <Plus size={16} />
              Vincular morador
            </button>
          )}

          {error && (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
          )}

          {/* ── Visitors ── */}
          {activeVisitors.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Visitantes em check-in</p>
              {activeVisitors.map((visitor) => (
                <div key={visitor.id} className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{visitor.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{visitor.email || "E-mail não informado"}</p>
                    </div>
                    <div className="text-xs text-slate-500 sm:text-right space-y-0.5">
                      <p>Check-in: {visitor.checkedInAt ? new Date(visitor.checkedInAt).toLocaleString("pt-BR") : "Agora"}</p>
                      <p>Até: {new Date(visitor.expectedCheckOut).toLocaleString("pt-BR")}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4 rounded-b-3xl">
          {isAdmin && onDeleteApartment && (
            <button
              type="button"
              onClick={handleDeleteApartment}
              disabled={saving}
              className="rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
            >
              {saving ? "Excluindo..." : "Excluir apartamento"}
            </button>
          )}
          <button
            className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
