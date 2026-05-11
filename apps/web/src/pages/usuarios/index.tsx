import {
  Filter, Pencil, Plus, Search, ShieldOff, ShieldCheck, Users, X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AppLayout from "../../features/layout/components/app-layout";
import { getUser } from "../../features/auth/services/auth";
import { canAddResident, getPlanLimits, PLAN_LABELS, type PlanId } from "../../config/plans";
import { supabase } from "../../lib/supabase";
import { fmtDate } from "../../lib/format";
import {
  inviteUser, listUsers, listCondominiosBasic, setUserRemoved, updateUserRecord,
  type CondominioBrief, type InviteUserPayload, type UpdateUserPayload, type UserRecord,
} from "../../features/dashboard/services/users";
import { listBuildingApartmentOptions, type BuildingApartmentOption } from "../../features/predio/services/predio";
import { SortTh, SortIcon } from "../../components/ui/sort-th";
import { Pagination } from "../../components/ui/pagination";
import {
  CAR_PLATE_INPUT_TITLE, CAR_PLATE_PATTERN,
  formatCarPlate, formatPhone, isCarPlateValid, isPhoneValid,
  normalizeCarPlate, PHONE_INPUT_TITLE, PHONE_PATTERN,
  RESIDENT_TYPE_LABEL, USER_STATUS_LABEL,
} from "../../features/dashboard/utils/user-form";

// ── Types ────────────────────────────────────────────────────────────────────
type Role = "ADMIN" | "MORADOR" | "PORTEIRO";
type ResidentType = "PROPRIETARIO" | "INQUILINO" | "VISITANTE";
type UserStatus = "ATIVO" | "INATIVO";
type SortKey = "name" | "email" | "role" | "status" | "created_at";

// ── Helpers ───────────────────────────────────────────────────────────────────
const inputCls = "px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 text-[13px] outline-none w-full focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition";

function apartmentLabel(a: BuildingApartmentOption) {
  return `${a.number} · ${a.level}o andar`;
}

// ── Filter Panel ─────────────────────────────────────────────────────────────
type FilterDraft = {
  roles: Role[];
  tipos: ResidentType[];
  status: UserStatus | "";
  habilitado: "" | "sim" | "nao";
  condominioId: string;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
};

function FilterPanel({ open, onClose, initial, onApply, condominios, isMasterAdmin }: {
  open: boolean; onClose: () => void; initial: FilterDraft;
  onApply: (f: FilterDraft) => void;
  condominios: CondominioBrief[]; isMasterAdmin: boolean;
}) {
  const [draft, setDraft] = useState<FilterDraft>(initial);

  useEffect(() => { if (open) setDraft(initial); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function apply() { onApply(draft); onClose(); }
  function clear() {
    setDraft({ roles: [], tipos: [], status: "", habilitado: "", condominioId: "", sortKey: "created_at", sortDir: "desc" });
  }

  function toggleRole(r: Role) {
    setDraft((d) => ({ ...d, roles: d.roles.includes(r) ? d.roles.filter((x) => x !== r) : [...d.roles, r] }));
  }
  function toggleTipo(t: ResidentType) {
    setDraft((d) => ({ ...d, tipos: d.tipos.includes(t) ? d.tipos.filter((x) => x !== t) : [...d.tipos, t] }));
  }

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: "created_at", label: "Data de cadastro" },
    { key: "name", label: "Nome" },
    { key: "email", label: "Email" },
    { key: "role", label: "Perfil" },
    { key: "status", label: "Status" },
  ];

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />}
      <div className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-800">Filtros e Ordenação</span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer transition-colors"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* Condomínio (MASTER_ADMIN only) */}
          {isMasterAdmin && condominios.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Condomínio</p>
              <select
                value={draft.condominioId}
                onChange={(e) => setDraft((d) => ({ ...d, condominioId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:border-indigo-400 bg-white"
              >
                <option value="">Todos os condomínios</option>
                {condominios.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {/* Perfil */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Perfil</p>
            <div className="space-y-1.5">
              {(["ADMIN", "MORADOR", "PORTEIRO"] as Role[]).map((r) => (
                <label key={r} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={draft.roles.includes(r)} onChange={() => toggleRole(r)} className="accent-indigo-600 w-4 h-4" />
                  <span className="text-sm text-gray-700">{r === "ADMIN" ? "Administrador" : r === "PORTEIRO" ? "Porteiro" : "Morador"}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Tipo */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tipo</p>
            <div className="space-y-1.5">
              {(["PROPRIETARIO", "INQUILINO", "VISITANTE"] as ResidentType[]).map((t) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={draft.tipos.includes(t)} onChange={() => toggleTipo(t)} className="accent-indigo-600 w-4 h-4" />
                  <span className="text-sm text-gray-700">{RESIDENT_TYPE_LABEL[t]}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Status</p>
            <div className="space-y-1.5">
              {([["", "Todos"], ["ATIVO", "Ativo"], ["INATIVO", "Inativo"]] as const).map(([val, label]) => (
                <label key={val} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="status" checked={draft.status === val} onChange={() => setDraft((d) => ({ ...d, status: val }))} className="accent-indigo-600" />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Habilitado */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Habilitado</p>
            <div className="space-y-1.5">
              {([["", "Todos"], ["sim", "Habilitado"], ["nao", "Desabilitado"]] as const).map(([val, label]) => (
                <label key={val} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="habilitado" checked={draft.habilitado === val} onChange={() => setDraft((d) => ({ ...d, habilitado: val }))} className="accent-indigo-600" />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Ordenar por */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Ordenar por</p>
            <select
              value={draft.sortKey}
              onChange={(e) => setDraft((d) => ({ ...d, sortKey: e.target.value as SortKey }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:border-indigo-400 bg-white"
            >
              {SORT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
            <div className="flex gap-2 mt-2">
              {(["desc", "asc"] as const).map((dir) => (
                <button key={dir} onClick={() => setDraft((d) => ({ ...d, sortDir: dir }))}
                  className={`flex-1 py-1.5 text-sm rounded-lg border cursor-pointer transition-colors ${draft.sortDir === dir ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                >
                  {dir === "desc" ? "Decrescente" : "Crescente"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
          <button onClick={clear} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors">Limpar</button>
          <button onClick={apply} className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold cursor-pointer transition-colors">Aplicar</button>
        </div>
      </div>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function UsuariosPage() {
  const currentUser = useMemo(() => getUser(), []);
  const isMasterAdmin = currentUser?.role === "MASTER_ADMIN";
  const isAdmin = currentUser?.role === "ADMIN" || isMasterAdmin;
  const isResident = currentUser?.role === "MORADOR";

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [condominios, setCondominios] = useState<CondominioBrief[]>([]);
  const [apartmentOptions, setApartmentOptions] = useState<BuildingApartmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [condPlan, setCondPlan] = useState<PlanId>(null);

  // ── URL state ──────────────────────────────────────────────────────────────
  const [searchParams, setSearchParams] = useSearchParams();
  const searchText = searchParams.get("q") ?? "";
  const filterRoles = (searchParams.get("role") ?? "").split(",").filter(Boolean) as Role[];
  const filterTipos = (searchParams.get("tipo") ?? "").split(",").filter(Boolean) as ResidentType[];
  const filterStatus = (searchParams.get("status") ?? "") as UserStatus | "";
  const filterHabilitado = (searchParams.get("habilitado") ?? "") as "" | "sim" | "nao";
  const filterCondominioId = searchParams.get("cond") ?? "";
  const sortKey = (searchParams.get("sort") ?? "created_at") as SortKey;
  const sortDir = (searchParams.get("dir") ?? "desc") as "asc" | "desc";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const rawSize = parseInt(searchParams.get("size") ?? "10", 10);
  const pageSize = [10, 20, 50].includes(rawSize) ? rawSize : 10;

  // ── UI state ───────────────────────────────────────────────────────────────
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [selectedTower, setSelectedTower] = useState("");

  const [inviteForm, setInviteForm] = useState<InviteUserPayload>({
    email: "", role: "MORADOR", residentType: "PROPRIETARIO", apartmentId: null, condominioId: currentUser?.condominioUUID ?? null,
  });
  const [editForm, setEditForm] = useState<Omit<UpdateUserPayload, "id">>({
    name: "", email: "", phone: "", carPlate: "", petsCount: null,
    role: "MORADOR", residentType: "PROPRIETARIO", status: "ATIVO", apartmentId: null,
  });

  // ── Data loading ───────────────────────────────────────────────────────────
  function loadData() {
    setLoading(true);
    setError("");
    const condId = isMasterAdmin ? (filterCondominioId || undefined) : (currentUser?.condominioUUID ?? undefined);

    if (!isMasterAdmin && currentUser?.condominioUUID) {
      supabase.from("condominios").select("plan").eq("id", currentUser.condominioUUID).single()
        .then(({ data }) => setCondPlan((data?.plan ?? null) as PlanId));
    }

    const promises: Promise<unknown>[] = [
      listUsers(condId).then(setUsers),
      listBuildingApartmentOptions().then(setApartmentOptions),
    ];
    if (isMasterAdmin) promises.push(listCondominiosBasic().then(setCondominios));

    Promise.all(promises)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadData(); }, [filterCondominioId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── URL setters ────────────────────────────────────────────────────────────
  function updateParam(key: string, value: string, resetPage = true) {
    setSearchParams((prev: URLSearchParams) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      if (resetPage) next.delete("page");
      return next;
    });
  }

  function setSearchText(v: string) { updateParam("q", v); }
  function setPage(p: number) {
    setSearchParams((prev: URLSearchParams) => {
      const next = new URLSearchParams(prev);
      if (p > 1) next.set("page", String(p)); else next.delete("page");
      return next;
    });
  }
  function setPageSize(s: number) {
    setSearchParams((prev: URLSearchParams) => {
      const next = new URLSearchParams(prev);
      if (s !== 10) next.set("size", String(s)); else next.delete("size");
      next.delete("page");
      return next;
    });
  }

  function handleSort(key: SortKey) {
    setSearchParams((prev: URLSearchParams) => {
      const next = new URLSearchParams(prev);
      const curKey = prev.get("sort") ?? "created_at";
      const curDir = prev.get("dir") ?? "desc";
      if (curKey === key) {
        const newDir = curDir === "asc" ? "desc" : "asc";
        if (newDir === "desc") next.delete("dir"); else next.set("dir", newDir);
      } else {
        if (key !== "created_at") next.set("sort", key); else next.delete("sort");
        next.delete("dir");
      }
      next.delete("page");
      return next;
    });
  }

  function applyFilters(f: FilterDraft) {
    setSearchParams((prev: URLSearchParams) => {
      const next = new URLSearchParams(prev);
      if (f.roles.length) next.set("role", f.roles.join(",")); else next.delete("role");
      if (f.tipos.length) next.set("tipo", f.tipos.join(",")); else next.delete("tipo");
      if (f.status) next.set("status", f.status); else next.delete("status");
      if (f.habilitado) next.set("habilitado", f.habilitado); else next.delete("habilitado");
      if (f.condominioId) next.set("cond", f.condominioId); else next.delete("cond");
      if (f.sortKey !== "created_at") next.set("sort", f.sortKey); else next.delete("sort");
      if (f.sortDir !== "desc") next.set("dir", f.sortDir); else next.delete("dir");
      next.delete("page");
      return next;
    });
  }

  // ── Filtering + sorting + pagination ──────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchText.toLowerCase();
    return users.filter((u) => {
      if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q) &&
        !(u.phone ?? "").toLowerCase().includes(q) && !(u.car_plate ?? "").toLowerCase().includes(q) &&
        !u.apartments.some((a) => a.number.toLowerCase().includes(q) || a.tower.toLowerCase().includes(q))) return false;
      if (filterRoles.length && !filterRoles.includes(u.role)) return false;
      if (filterTipos.length && !filterTipos.includes(u.resident_type)) return false;
      if (filterStatus && u.status !== filterStatus) return false;
      if (filterHabilitado === "sim" && u.removed) return false;
      if (filterHabilitado === "nao" && !u.removed) return false;
      return true;
    });
  }, [users, searchText, filterRoles, filterTipos, filterStatus, filterHabilitado]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "email") cmp = a.email.localeCompare(b.email);
      else if (sortKey === "role") cmp = a.role.localeCompare(b.role);
      else if (sortKey === "status") cmp = a.status.localeCompare(b.status);
      else cmp = a.created_at.localeCompare(b.created_at);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalFiltered = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const activeFilterCount = (filterRoles.length ? 1 : 0) + (filterTipos.length ? 1 : 0)
    + [filterStatus, filterHabilitado, filterCondominioId].filter(Boolean).length
    + (sortKey !== "created_at" || sortDir !== "desc" ? 1 : 0);

  // ── Modals ─────────────────────────────────────────────────────────────────
  function openInvite() {
    setInviteForm({ email: "", role: "MORADOR", residentType: "PROPRIETARIO", apartmentId: null, condominioId: currentUser?.condominioUUID ?? null });
    setSelectedTower("");
    setFormError("");
    setInviteOpen(true);
  }

  function openEdit(u: UserRecord) {
    setEditingUser(u);
    setEditForm({
      name: u.name, email: u.email, phone: u.phone ?? "",
      carPlate: u.car_plate ?? "", petsCount: u.pets_count ?? null,
      role: u.role, residentType: u.resident_type, status: u.status,
      apartmentId: u.apartment_id,
    });
    setSelectedTower(u.apartment_tower ?? "");
    setFormError("");
    setEditOpen(true);
  }

  // ── Handlers ───────────────────────────────────────────────────────────────
  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      const residentCount = users.filter((u) => u.role === "MORADOR" && !u.removed).length;
      if (inviteForm.role === "MORADOR" && !canAddResident(condPlan, residentCount)) {
        const limits = getPlanLimits(condPlan);
        throw new Error(`Limite de ${limits.maxResidents} moradores do plano ${PLAN_LABELS[condPlan ?? "go"] ?? condPlan} atingido.`);
      }
      await inviteUser(inviteForm);
      setInviteOpen(false);
      loadData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erro ao enviar convite.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setSubmitting(true);
    setFormError("");
    const phone = formatPhone(editForm.phone);
    if (phone && !isPhoneValid(phone)) {
      setFormError("Informe um telefone válido no formato (11) 99999-9999.");
      setSubmitting(false);
      return;
    }
    const plate = normalizeCarPlate(editForm.carPlate);
    if (!isCarPlateValid(plate)) {
      setFormError("Placa inválida. Use ABC-1234 ou ABC1D23.");
      setSubmitting(false);
      return;
    }
    try {
      await updateUserRecord({ id: editingUser.id, ...editForm, phone, carPlate: plate } satisfies UpdateUserPayload);
      setEditOpen(false);
      loadData();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erro ao atualizar usuário.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleRemoved(u: UserRecord) {
    const action = u.removed ? "habilitar" : "desabilitar";
    if (!window.confirm(`Deseja ${action} o usuário ${u.name || u.email}?`)) return;
    try {
      await setUserRemoved(u.id, !u.removed);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Erro ao ${action} usuário.`);
    }
  }

  // ── Apartment selects ──────────────────────────────────────────────────────
  const towerOptions = useMemo(
    () => Array.from(new Set(apartmentOptions.map((a) => a.tower))).sort((a, b) => a.localeCompare(b)),
    [apartmentOptions]
  );
  const availableApartments = useMemo(
    () => apartmentOptions.filter((a) => {
      if (!selectedTower || a.tower !== selectedTower) return false;
      return a.residentId === null || editingUser?.apartment_ids.includes(a.id);
    }),
    [apartmentOptions, selectedTower, editingUser]
  );

  const filterDraft: FilterDraft = {
    roles: filterRoles, tipos: filterTipos, status: filterStatus,
    habilitado: filterHabilitado, condominioId: filterCondominioId,
    sortKey, sortDir,
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <AppLayout title="Usuários">
      <div className="grid gap-4">

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {!isResident && (
              <button
                onClick={() => setFilterPanelOpen(true)}
                className={`relative flex items-center justify-center w-9 h-9 rounded-xl border cursor-pointer transition-colors ${activeFilterCount > 0 ? "bg-indigo-50 border-indigo-300 text-indigo-600" : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"}`}
              >
                <Filter size={15} />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text" placeholder={isResident ? "Buscar por nome..." : "Buscar por nome, email, telefone, bloco ou placa..."}
                value={searchText} onChange={(e) => setSearchText(e.target.value)}
                className="pl-8 pr-3 py-2 border border-gray-200 rounded-xl bg-white text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-indigo-400 w-80 transition-colors"
              />
              {searchText && (
                <button onClick={() => setSearchText("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
          {isAdmin && (
            <button onClick={openInvite}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-sm font-semibold cursor-pointer border-none transition-all shrink-0 shadow-sm shadow-indigo-200">
              <Plus size={15} /> Convidar usuário
            </button>
          )}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {/* Loading */}
        {loading && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-8 bg-gray-100 rounded-lg animate-pulse" />)}
          </div>
        )}

        {/* Empty */}
        {!loading && pageItems.length === 0 && !error && (
          <div className="bg-white border border-gray-200 rounded-2xl p-12 flex flex-col items-center gap-3 text-center shadow-sm">
            <Users size={36} className="text-gray-300" />
            <p className="text-base text-gray-500">Nenhum usuário encontrado.</p>
          </div>
        )}

        {/* Table */}
        {!loading && pageItems.length > 0 && (
          <div className="hidden md:block bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50/80">
                    <SortTh col="name" label="Nome" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    <SortTh col="role" label="Perfil" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                    {!isResident && <th className="px-3 py-3 border-b border-gray-100 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase whitespace-nowrap">Tipo</th>}
                    {!isResident && <SortTh col="status" label="Status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />}
                    {!isResident && <th className="px-3 py-3 border-b border-gray-100 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase whitespace-nowrap">Habilitado</th>}
                    <th className="px-3 py-3 border-b border-gray-100 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase whitespace-nowrap">Unidade</th>
                    {!isResident && <SortTh col="created_at" label="Cadastro" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />}
                    {isAdmin && <th className="px-3 py-3 border-b border-gray-100 text-center text-xs font-semibold tracking-wider text-gray-500 uppercase">Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((u, idx) => (
                    <tr key={u.id} style={{ animationDelay: `${idx * 20}ms` }}
                      className="transition-colors hover:bg-indigo-50/30">
                      <td className="px-3 py-3 border-b border-gray-100">
                        <p className="font-medium text-gray-800">{u.name || <span className="text-gray-400 italic">Pendente</span>}</p>
                        {!isResident && <p className="text-xs text-gray-400 mt-0.5">{u.email}</p>}
                      </td>
                      <td className="px-3 py-3 border-b border-gray-100">
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${u.role === "ADMIN" ? "border-indigo-200 bg-indigo-50 text-indigo-600" : u.role === "PORTEIRO" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-gray-200 bg-gray-100 text-gray-600"}`}>
                          {u.role === "ADMIN" ? "Administrador" : u.role === "PORTEIRO" ? "Porteiro" : "Morador"}
                        </span>
                      </td>
                      {!isResident && <td className="px-3 py-3 border-b border-gray-100 text-gray-500 text-sm">{RESIDENT_TYPE_LABEL[u.resident_type]}</td>}
                      {!isResident && (
                        <td className="px-3 py-3 border-b border-gray-100">
                          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${u.status === "ATIVO" ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-gray-200 bg-gray-100 text-gray-600"}`}>
                            {USER_STATUS_LABEL[u.status]}
                          </span>
                        </td>
                      )}
                      {!isResident && (
                        <td className="px-3 py-3 border-b border-gray-100">
                          {u.removed
                            ? <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600"><ShieldOff size={10} /> Não</span>
                            : <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600"><ShieldCheck size={10} /> Sim</span>
                          }
                        </td>
                      )}
                      <td className="px-3 py-3 border-b border-gray-100 text-gray-500 text-sm">
                        {u.apartments.length > 0 ? u.apartments.map((a) => `${a.tower} · Apto ${a.number}`).join(", ") : "—"}
                      </td>
                      {!isResident && <td className="px-3 py-3 border-b border-gray-100 text-gray-400 text-sm whitespace-nowrap">{fmtDate(u.created_at)}</td>}
                      {isAdmin && (
                        <td className="px-3 py-3 border-b border-gray-100">
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => openEdit(u)} title="Editar"
                              className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 text-gray-400 cursor-pointer transition-colors">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => handleToggleRemoved(u)}
                              title={u.removed ? "Habilitar" : "Desabilitar"}
                              className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${u.removed ? "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "border-rose-200 bg-white text-rose-400 hover:bg-rose-50 hover:text-rose-600"}`}>
                              {u.removed ? <ShieldCheck size={14} /> : <ShieldOff size={14} />}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-3 py-2 border-t border-gray-100">
              <Pagination page={safePage} totalPages={totalPages} total={totalFiltered} pageSize={pageSize} setPage={setPage} setPageSize={setPageSize} />
            </div>
          </div>
        )}

        {/* Mobile cards */}
        {!loading && pageItems.length > 0 && (
          <div className="md:hidden grid gap-3">
            {pageItems.map((u) => (
              <div key={u.id} className={`bg-white border border-gray-200 rounded-2xl p-4 shadow-sm ${!isResident && u.removed ? "opacity-50" : ""}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-semibold text-gray-800">{u.name || <span className="text-gray-400 italic text-sm">Pendente</span>}</p>
                    {!isResident && <p className="text-xs text-gray-400">{u.email}</p>}
                  </div>
                  {!isResident && (u.removed
                    ? <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600 shrink-0"><ShieldOff size={10} /> Desabilitado</span>
                    : <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 shrink-0"><ShieldCheck size={10} /> Habilitado</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${u.role === "ADMIN" ? "border-indigo-200 bg-indigo-50 text-indigo-600" : u.role === "PORTEIRO" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-gray-200 bg-gray-100 text-gray-600"}`}>
                    {u.role === "ADMIN" ? "Admin" : u.role === "PORTEIRO" ? "Porteiro" : "Morador"}
                  </span>
                  {!isResident && (
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${u.status === "ATIVO" ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-gray-200 bg-gray-100 text-gray-600"}`}>
                      {USER_STATUS_LABEL[u.status]}
                    </span>
                  )}
                </div>
                {u.apartments.length > 0 && (
                  <p className="text-xs text-gray-500 mb-3">{u.apartments.map((a) => `${a.tower} · Apto ${a.number}`).join(", ")}</p>
                )}
                {isAdmin && (
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(u)} className="flex-1 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:border-indigo-200 hover:text-indigo-600 cursor-pointer transition-colors">Editar</button>
                    <button onClick={() => handleToggleRemoved(u)}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${u.removed ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50" : "border-rose-200 text-rose-500 hover:bg-rose-50"}`}>
                      {u.removed ? "Habilitar" : "Desabilitar"}
                    </button>
                  </div>
                )}
              </div>
            ))}
            <div className="bg-white border border-gray-200 rounded-2xl px-3 py-2 shadow-sm">
              <Pagination page={safePage} totalPages={totalPages} total={totalFiltered} pageSize={pageSize} setPage={setPage} setPageSize={setPageSize} />
            </div>
          </div>
        )}
      </div>

      {/* Filter Panel */}
      <FilterPanel open={filterPanelOpen} onClose={() => setFilterPanelOpen(false)}
        initial={filterDraft} onApply={applyFilters} condominios={condominios} isMasterAdmin={isMasterAdmin} />

      {/* Invite Modal */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Convidar usuário</h3>
              <button onClick={() => setInviteOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer transition-colors"><X size={18} /></button>
            </div>
            <form onSubmit={handleInvite} className="px-6 py-4 space-y-4">
              <p className="text-xs text-gray-500">Um e-mail será enviado para o usuário completar o cadastro.</p>
              <div className="grid gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">E-mail *</label>
                <input type="email" required placeholder="email@exemplo.com" value={inviteForm.email}
                  onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} />
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Perfil</label>
                <select value={inviteForm.role} onChange={(e) => setInviteForm((f) => ({ ...f, role: e.target.value as Role }))} className={inputCls}>
                  <option value="MORADOR">Morador</option>
                  <option value="PORTEIRO">Porteiro</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tipo</label>
                <select value={inviteForm.residentType} onChange={(e) => setInviteForm((f) => ({ ...f, residentType: e.target.value as ResidentType }))} className={inputCls}>
                  <option value="PROPRIETARIO">Proprietário</option>
                  <option value="INQUILINO">Inquilino</option>
                  <option value="VISITANTE">Visitante</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Bloco</label>
                  <select value={selectedTower} onChange={(e) => { setSelectedTower(e.target.value); setInviteForm((f) => ({ ...f, apartmentId: null })); }} className={inputCls}>
                    <option value="">Sem bloco</option>
                    {towerOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Apartamento</label>
                  <select value={inviteForm.apartmentId ?? ""} onChange={(e) => setInviteForm((f) => ({ ...f, apartmentId: e.target.value || null }))} disabled={!selectedTower} className={inputCls}>
                    <option value="">{selectedTower ? "Sem apto" : "Selecione o bloco"}</option>
                    {availableApartments.map((a) => <option key={a.id} value={a.id}>{apartmentLabel(a)}</option>)}
                  </select>
                </div>
              </div>
              {formError && <p className="text-xs text-rose-500">{formError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setInviteOpen(false)} disabled={submitting}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors">Cancelar</button>
                <button type="submit" disabled={submitting}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 cursor-pointer transition-colors">
                  {submitting ? "Enviando..." : "Enviar convite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Editar usuário</h3>
              <button onClick={() => setEditOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer transition-colors"><X size={18} /></button>
            </div>
            <form onSubmit={handleEdit} className="flex min-h-0 flex-1 flex-col">
              <div className="grid min-h-0 gap-6 overflow-y-auto px-6 py-4 md:grid-cols-2">
                <div className="grid gap-4">
                  {([
                    { label: "Nome completo", type: "text", key: "name" as const, placeholder: "Nome completo" },
                    { label: "Email", type: "email", key: "email" as const, placeholder: "email@exemplo.com" },
                    { label: "Telefone", type: "tel", key: "phone" as const, placeholder: "(11) 99999-9999" },
                  ]).map((f) => (
                    <div key={f.key} className="grid gap-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">{f.label}</label>
                      <input type={f.type} placeholder={f.placeholder} value={editForm[f.key] as string}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, [f.key]: f.key === "phone" ? formatPhone(e.target.value) : e.target.value }))}
                        pattern={f.key === "phone" ? PHONE_PATTERN : undefined}
                        title={f.key === "phone" ? PHONE_INPUT_TITLE : undefined}
                        inputMode={f.key === "phone" ? "tel" : undefined}
                        maxLength={f.key === "phone" ? 15 : undefined}
                        className={inputCls} />
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Placa</label>
                      <input value={editForm.carPlate} onChange={(e) => setEditForm((prev) => ({ ...prev, carPlate: formatCarPlate(e.target.value) }))}
                        placeholder="ABC-1234" pattern={CAR_PLATE_PATTERN} title={CAR_PLATE_INPUT_TITLE} maxLength={8} className={inputCls} />
                    </div>
                    <div className="grid gap-1.5">
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Pets</label>
                      <input type="number" min={0} value={editForm.petsCount ?? ""}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, petsCount: e.target.value === "" ? null : Number(e.target.value) }))}
                        placeholder="0" className={inputCls} />
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 content-start">
                  <div className="grid gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Perfil</label>
                    <select value={editForm.role} onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value as Role }))} className={inputCls}>
                      <option value="MORADOR">Morador</option>
                      <option value="PORTEIRO">Porteiro</option>
                      <option value="ADMIN">Administrador</option>
                    </select>
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tipo</label>
                    <select value={editForm.residentType} onChange={(e) => setEditForm((prev) => ({ ...prev, residentType: e.target.value as ResidentType }))} className={inputCls}>
                      <option value="PROPRIETARIO">Proprietário</option>
                      <option value="INQUILINO">Inquilino</option>
                      <option value="VISITANTE">Visitante</option>
                    </select>
                  </div>
                  <div className="grid gap-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Status</label>
                    <select value={editForm.status} onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value as UserStatus }))} className={inputCls}>
                      <option value="ATIVO">Ativo</option>
                      <option value="INATIVO">Inativo</option>
                    </select>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 grid gap-3">
                    <p className="text-sm font-semibold text-gray-700">Unidade</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Bloco</label>
                        <select value={selectedTower} onChange={(e) => { setSelectedTower(e.target.value); setEditForm((prev) => ({ ...prev, apartmentId: null })); }} className={inputCls}>
                          <option value="">Sem bloco</option>
                          {towerOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="grid gap-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Apartamento</label>
                        <select value={editForm.apartmentId ?? ""} onChange={(e) => setEditForm((prev) => ({ ...prev, apartmentId: e.target.value || null }))} disabled={!selectedTower} className={inputCls}>
                          <option value="">{selectedTower ? "Sem apto" : "Selecione o bloco"}</option>
                          {availableApartments.map((a) => <option key={a.id} value={a.id}>{apartmentLabel(a)}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-100 px-6 py-4">
                {formError && <p className="mb-3 text-xs text-rose-500">{formError}</p>}
                <div className="flex justify-end gap-2.5">
                  <button type="button" onClick={() => setEditOpen(false)} disabled={submitting}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors">Cancelar</button>
                  <button type="submit" disabled={submitting}
                    className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 cursor-pointer transition-colors">
                    {submitting ? "Salvando..." : "Salvar alterações"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
