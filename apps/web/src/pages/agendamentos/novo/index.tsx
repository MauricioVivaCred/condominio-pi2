import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import AppLayout from "../../../features/layout/components/app-layout";
import { createResourceBooking } from "../../../features/agendamentos/services/agendamentos";
import { listRecursos, type Recurso } from "../../../features/agendamentos/services/recursos";
import { getIcone } from "../../../features/agendamentos/utils/icones";

const MONTHS_PT = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];
const WEEK_DAYS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

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

const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition";

export default function NovoAgendamento() {
  const nav = useNavigate();
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toKey(today), [today]);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [loadingRecursos, setLoadingRecursos] = useState(true);
  const [resource, setResource] = useState("");
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("1h");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    listRecursos(true).then(recs => {
      setRecursos(recs);
      if (recs.length > 0) setResource(recs[0].slug);
    }).finally(() => setLoadingRecursos(false));
  }, []);

  const grid = useMemo(() => buildGrid(currentMonth), [currentMonth]);
  const canGoPrev = startOfMonth(currentMonth).getTime() > startOfMonth(today).getTime();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDate) { setErr("Selecione uma data."); return; }
    if (!time) { setErr("Informe o horário."); return; }
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

  function openMobileDatePicker() {
    const el = dateInputRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") el.showPicker();
    else el.click();
  }

  const selectedLabel = selectedDate
    ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString("pt-BR", {
        weekday: "long", day: "2-digit", month: "long", year: "numeric",
      })
    : "Toque para selecionar";

  if (loadingRecursos) {
    return (
      <AppLayout title="Criar Agendamento">
        <div className="flex justify-center items-center h-full">
          <Loader2 size={24} className="animate-spin text-indigo-400" />
        </div>
      </AppLayout>
    );
  }

  if (recursos.length === 0) {
    return (
      <AppLayout title="Criar Agendamento">
        <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
          <CalendarDays size={36} className="text-gray-200" />
          <p className="text-sm font-semibold text-gray-500">Nenhuma área comum disponível</p>
          <p className="text-xs text-gray-400">O síndico precisa configurar as áreas comuns antes de criar agendamentos.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Criar Agendamento">
      <form onSubmit={handleSubmit} className="flex h-full gap-5 overflow-hidden flex-col lg:flex-row">

        {/* Left: form */}
        <div className="lg:w-72 shrink-0 flex flex-col gap-4 min-h-0 overflow-y-auto lg:overflow-visible lg:overflow-y-auto">

          {/* Resource selector */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">Local</p>
            <div className="flex flex-col gap-1.5">
              {recursos.map(r => {
                const Icon = getIcone(r.icone);
                const active = resource === r.slug;
                return (
                  <button key={r.slug} type="button" onClick={() => setResource(r.slug)}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      active ? "border-indigo-300 bg-indigo-50" : "border-gray-200 bg-white hover:border-gray-300"
                    }`}>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active ? "bg-indigo-100" : "bg-gray-100"}`}>
                      <Icon size={15} className={active ? "text-indigo-600" : "text-gray-400"} />
                    </span>
                    <span>
                      <span className={`block text-sm font-bold ${active ? "text-indigo-700" : "text-gray-800"}`}>{r.nome}</span>
                      {r.descricao && <span className="block text-xs text-gray-400 line-clamp-1">{r.descricao}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date — mobile only: tappable field + hidden input */}
          <div className="lg:hidden">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Data</p>
            <button type="button" onClick={openMobileDatePicker}
              className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                selectedDate ? "border-indigo-200 bg-indigo-50" : "border-gray-200 bg-white hover:border-gray-300"
              }`}>
              <CalendarDays size={16} className={selectedDate ? "text-indigo-500" : "text-gray-400"} />
              <span className={`text-sm font-semibold capitalize ${selectedDate ? "text-indigo-700" : "text-gray-400"}`}>
                {selectedLabel}
              </span>
            </button>
            <input
              ref={dateInputRef}
              type="date"
              min={todayKey}
              value={selectedDate ?? ""}
              onChange={e => {
                const v = e.target.value;
                setSelectedDate(v || null);
                if (v) setCurrentMonth(startOfMonth(new Date(`${v}T12:00:00`)));
              }}
              className="sr-only"
            />
          </div>

          {/* Desktop date display */}
          <div className="hidden lg:block">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Data selecionada</p>
            <div className={`rounded-xl border px-4 py-3 ${selectedDate ? "border-indigo-200 bg-indigo-50" : "border-gray-200 bg-gray-50"}`}>
              <p className={`text-sm font-bold capitalize ${selectedDate ? "text-indigo-700" : "text-gray-400"}`}>
                {selectedDate
                  ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString("pt-BR", { weekday:"long", day:"2-digit", month:"long", year:"numeric" })
                  : "Clique no calendário →"}
              </p>
            </div>
          </div>

          {/* Time */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
              Horário <span className="text-red-400">*</span>
            </label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} className={inputCls} />
          </div>

          {/* Duration */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Duração</label>
            <select value={duration} onChange={e => setDuration(e.target.value)} className={inputCls}>
              <option value="1h">1 hora</option>
              <option value="2h">2 horas</option>
              <option value="3h">3 horas</option>
              <option value="4h">4 horas</option>
            </select>
          </div>

          {/* Note */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Observações</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
              placeholder="Ex.: aniversário, reunião..." className={`${inputCls} resize-none`} />
          </div>

          {err && <p className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-600">{err}</p>}

          <button type="submit" disabled={saving}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition cursor-pointer">
            {saving ? "Salvando..." : "Confirmar agendamento"}
          </button>
        </div>

        {/* Right: calendar (desktop only) */}
        <div className="hidden lg:flex flex-1 min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <button type="button" onClick={() => setCurrentMonth(m => addMonths(m, -1))} disabled={!canGoPrev}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <span className="text-base font-bold text-gray-900">
              {MONTHS_PT[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <button type="button" onClick={() => setCurrentMonth(m => addMonths(m, 1))}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="shrink-0 grid grid-cols-7 border-b border-gray-100">
            {WEEK_DAYS.map(d => (
              <div key={d} className="py-2 text-center text-[11px] font-bold uppercase tracking-wide text-gray-400">{d}</div>
            ))}
          </div>

          <div className="flex-1 min-h-0 grid grid-cols-7 grid-rows-6 overflow-hidden">
            {grid.map((day, i) => {
              const key = toKey(day);
              const inMonth = isSameMonth(day, currentMonth);
              const isToday = key === todayKey;
              const isSelected = key === selectedDate;
              const isPast = startOfDay(day).getTime() < startOfDay(today).getTime();
              const disabled = !inMonth || isPast;

              return (
                <button key={`${key}-${i}`} type="button" disabled={disabled}
                  onClick={() => !disabled && setSelectedDate(key)}
                  className={`relative flex flex-col border-b border-r border-gray-100 px-2 py-1.5 transition-colors ${
                    disabled ? "bg-gray-50/60 cursor-default"
                    : isSelected ? "bg-indigo-600 cursor-pointer"
                    : "hover:bg-indigo-50 cursor-pointer"
                  }`}>
                  <span className={`text-xs font-bold ${
                    !inMonth ? "text-gray-300"
                    : isSelected ? "text-white"
                    : isToday ? "text-indigo-600"
                    : isPast ? "text-gray-400"
                    : "text-gray-800"
                  }`}>{day.getDate()}</span>
                  {isToday && !isSelected && (
                    <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  )}
                  {isSelected && (
                    <span className="mt-auto text-[10px] font-bold text-white/80 text-center w-full">✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </form>
    </AppLayout>
  );
}
