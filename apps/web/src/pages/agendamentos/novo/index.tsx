import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import AppLayout from "../../../features/layout/components/app-layout";
import {
  createResourceBooking,
  listResourceBookings,
  type ResourceBooking,
} from "../../../features/agendamentos/services/agendamentos";
import { listRecursos, type Recurso } from "../../../features/agendamentos/services/recursos";
import { getIcone } from "../../../features/agendamentos/utils/icones";
import { getUser } from "../../../features/auth/services/auth";

const MONTHS_PT = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];
const WEEK_DAYS = ["D","S","T","Q","Q","S","S"];

function pad(v: number) { return String(v).padStart(2, "0"); }
function toKey(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}
function buildGrid(month: Date) {
  const first = startOfMonth(month);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start); d.setDate(start.getDate() + i); return d;
  });
}

const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition bg-white";
const labelCls = "block text-xs font-bold uppercase tracking-wide text-gray-400 mb-1.5";

export default function NovoAgendamento() {
  const nav = useNavigate();
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toKey(today), [today]);
  const currentUser = useMemo(() => getUser(), []);

  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [bookings, setBookings] = useState<ResourceBooking[]>([]);
  const [loadingRecursos, setLoadingRecursos] = useState(true);

  const [resource, setResource] = useState("");
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("1h");
  const [pessoas, setPessoas] = useState("1");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    Promise.all([listRecursos(true), listResourceBookings()]).then(([recs, bks]) => {
      setRecursos(recs);
      setBookings(bks);
      if (recs.length > 0) setResource(recs[0].slug);
    }).finally(() => setLoadingRecursos(false));
  }, []);

  const resourceBookings = useMemo(
    () => bookings.filter(b => b.resourceId === resource),
    [bookings, resource],
  );

  const byDate = useMemo(() => {
    const m = new Map<string, ResourceBooking>();
    for (const b of resourceBookings) m.set(b.date, b);
    return m;
  }, [resourceBookings]);

  const conflict = selectedDate ? byDate.get(selectedDate) ?? null : null;
  const grid = useMemo(() => buildGrid(currentMonth), [currentMonth]);
  const canGoPrev = startOfMonth(currentMonth).getTime() > startOfMonth(today).getTime();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDate) { setErr("Selecione uma data."); return; }
    if (!time) { setErr("Informe o horário."); return; }
    if (conflict) { setErr("Esta data já está reservada para este local."); return; }
    setSaving(true);
    setErr("");
    try {
      await createResourceBooking({ resourceId: resource, date: selectedDate, time, duration, note });
      nav("/agendamentos");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro ao criar agendamento.");
    } finally {
      setSaving(false);
    }
  }

  if (loadingRecursos) {
    return (
      <AppLayout title="Criar Agendamento">
        <div className="flex justify-center items-center py-20">
          <Loader2 size={24} className="animate-spin text-indigo-400" />
        </div>
      </AppLayout>
    );
  }

  if (recursos.length === 0) {
    return (
      <AppLayout title="Criar Agendamento">
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <AlertTriangle size={32} className="text-amber-400" />
          <p className="text-sm font-semibold text-gray-600">Nenhuma área comum disponível</p>
          <p className="text-xs text-gray-400">O síndico precisa cadastrar as áreas comuns primeiro.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Criar Agendamento">
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Card: responsável + local */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
            <h3 className="text-sm font-bold text-gray-700">Informações gerais</h3>

            {/* Responsável */}
            <div>
              <label className={labelCls}>Morador responsável</label>
              <input
                type="text"
                value={currentUser?.name ?? currentUser?.email ?? ""}
                disabled
                className={`${inputCls} bg-gray-50 text-gray-500 cursor-not-allowed`}
              />
            </div>

            {/* Local */}
            <div>
              <label className={labelCls}>Local</label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {recursos.map(r => {
                  const Icon = getIcone(r.icone);
                  const active = resource === r.slug;
                  return (
                    <button key={r.slug} type="button"
                      onClick={() => { setResource(r.slug); setSelectedDate(null); }}
                      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                        active ? "border-indigo-300 bg-indigo-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}>
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active ? "bg-indigo-100" : "bg-gray-100"}`}>
                        <Icon size={15} className={active ? "text-indigo-600" : "text-gray-400"} />
                      </span>
                      <span className={`text-sm font-semibold leading-tight ${active ? "text-indigo-700" : "text-gray-700"}`}>
                        {r.nome}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Card: calendário */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4">Data da reserva</h3>

            {/* Month nav */}
            <div className="flex items-center justify-between mb-3">
              <button type="button" onClick={() => setCurrentMonth(m => addMonths(m, -1))} disabled={!canGoPrev}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 transition-colors">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-bold text-gray-800">
                {MONTHS_PT[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </span>
              <button type="button" onClick={() => setCurrentMonth(m => addMonths(m, 1))}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 mb-1">
              {WEEK_DAYS.map((d, i) => (
                <div key={i} className="py-1 text-center text-[10px] font-bold uppercase text-gray-400">{d}</div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {grid.map((day, i) => {
                const key = toKey(day);
                const inMonth = isSameMonth(day, currentMonth);
                const isToday = key === todayKey;
                const isSelected = key === selectedDate;
                const isPast = startOfDay(day).getTime() < startOfDay(today).getTime();
                const hasBooking = byDate.has(key);
                const disabled = !inMonth || isPast;

                return (
                  <button key={`${key}-${i}`} type="button" disabled={disabled}
                    onClick={() => !disabled && setSelectedDate(isSelected ? null : key)}
                    className={`relative flex flex-col items-center justify-center rounded-lg h-9 text-xs font-semibold transition-colors ${
                      disabled
                        ? "text-gray-300 cursor-default"
                        : isSelected
                          ? "bg-indigo-600 text-white cursor-pointer"
                          : hasBooking
                            ? "bg-rose-50 text-rose-500 cursor-pointer hover:bg-rose-100"
                            : isToday
                              ? "bg-indigo-50 text-indigo-600 cursor-pointer hover:bg-indigo-100"
                              : "text-gray-700 cursor-pointer hover:bg-gray-100"
                    }`}>
                    {day.getDate()}
                    {hasBooking && !isSelected && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-rose-400" />
                    )}
                    {isToday && !isSelected && !hasBooking && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-indigo-400" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100">
              <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="h-2 w-2 rounded-full bg-indigo-400" /> Hoje
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="h-2 w-2 rounded-full bg-rose-400" /> Reservado
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="h-2 w-2 rounded-full bg-indigo-600" /> Selecionado
              </span>
            </div>

            {/* Conflict warning */}
            {conflict && (
              <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-100 px-4 py-3">
                <AlertTriangle size={15} className="shrink-0 text-rose-500 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-rose-700">Data já reservada</p>
                  <p className="text-xs text-rose-500 mt-0.5">
                    {conflict.authorName} reservou às {conflict.time} ({conflict.duration}).
                  </p>
                </div>
              </div>
            )}

            {/* Selected date display */}
            {selectedDate && !conflict && (
              <div className="mt-3 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-2.5">
                <p className="text-sm font-semibold text-emerald-700 capitalize">
                  {new Date(`${selectedDate}T12:00:00`).toLocaleDateString("pt-BR", {
                    weekday: "long", day: "2-digit", month: "long", year: "numeric",
                  })}
                </p>
                <p className="text-xs text-emerald-500 mt-0.5">Data disponível ✓</p>
              </div>
            )}
          </div>

          {/* Card: horário, duração, pessoas */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4">Detalhes</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className={labelCls}>Horário <span className="text-red-400">*</span></label>
                <input type="time" value={time} onChange={e => setTime(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Duração</label>
                <select value={duration} onChange={e => setDuration(e.target.value)} className={inputCls}>
                  <option value="1h">1 hora</option>
                  <option value="2h">2 horas</option>
                  <option value="3h">3 horas</option>
                  <option value="4h">4 horas</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Qtd. de pessoas</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={pessoas}
                  onChange={e => setPessoas(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          {/* Card: observações */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4">Observações</h3>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={4}
              placeholder="Descreva o evento, necessidades especiais, configuração do espaço..."
              className={`${inputCls} resize-none`}
            />
          </div>

          {err && (
            <div className="flex items-center gap-2.5 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
              <AlertTriangle size={15} className="shrink-0 text-red-500" />
              <p className="text-sm text-red-600">{err}</p>
            </div>
          )}

          <button type="submit" disabled={saving || !!conflict}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl text-sm transition cursor-pointer">
            {saving ? "Salvando..." : "Confirmar agendamento"}
          </button>

        </form>
      </div>
    </AppLayout>
  );
}
