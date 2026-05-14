import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarCheck, ChevronLeft, ChevronRight, Droplet, Users } from "lucide-react";
import AppLayout from "../../../features/layout/components/app-layout";
import { createResourceBooking } from "../../../features/agendamentos/services/agendamentos";

type Resource = {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const RESOURCES: Resource[] = [
  { id: "salao",   label: "Salão de Festas",  description: "Ideal para aniversários e confraternizações.", icon: Users },
  { id: "piscina", label: "Piscina",           description: "Agende o dia para uso da piscina.",            icon: Droplet },
  { id: "reuniao", label: "Sala de Reuniões",  description: "Use para encontros e reuniões do condomínio.", icon: CalendarCheck },
];

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
function isSameMonth(a: Date, b: Date) { return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth(); }

function buildGrid(month: Date) {
  const first = startOfMonth(month);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition";

export default function NovoAgendamento() {
  const nav = useNavigate();
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toKey(today), [today]);

  const [resource, setResource] = useState(RESOURCES[0].id);
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("1h");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const grid = useMemo(() => buildGrid(currentMonth), [currentMonth]);
  const canGoPrev = startOfMonth(currentMonth).getTime() > startOfMonth(today).getTime();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDate) { setErr("Selecione uma data no calendário."); return; }
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

  const selectedLabel = selectedDate
    ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString("pt-BR", { weekday:"long", day:"2-digit", month:"long", year:"numeric" })
    : "Nenhuma data selecionada";

  return (
    <AppLayout title="Criar Agendamento">
      <form onSubmit={handleSubmit} className="flex h-full gap-6 overflow-hidden flex-col lg:flex-row">

        {/* Left: form fields */}
        <div className="lg:w-80 shrink-0 flex flex-col gap-5 lg:overflow-y-auto lg:pr-1">
          {/* Back */}
          <button type="button" onClick={() => nav("/agendamentos")}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors w-fit">
            <ChevronLeft size={15} /> Voltar
          </button>

          {/* Resource selector */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Local</p>
            <div className="flex flex-col gap-2">
              {RESOURCES.map(r => {
                const Icon = r.icon;
                const active = resource === r.id;
                return (
                  <button key={r.id} type="button" onClick={() => setResource(r.id)}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                      active ? "border-indigo-300 bg-indigo-50" : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                    }`}>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${active ? "bg-indigo-100" : "bg-gray-100"}`}>
                      <Icon size={17} className={active ? "text-indigo-600" : "text-gray-500"} />
                    </span>
                    <span>
                      <span className={`block text-sm font-semibold ${active ? "text-indigo-700" : "text-gray-800"}`}>{r.label}</span>
                      <span className="block text-xs text-gray-400">{r.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected date display */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-0.5">Data selecionada</p>
            <p className={`text-sm font-semibold capitalize ${selectedDate ? "text-indigo-700" : "text-gray-400"}`}>
              {selectedLabel}
            </p>
          </div>

          {/* Time */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Horário <span className="text-red-400">*</span>
            </label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} className={inputCls} />
          </div>

          {/* Duration */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Duração</label>
            <select value={duration} onChange={e => setDuration(e.target.value)} className={inputCls}>
              <option value="1h">1 hora</option>
              <option value="2h">2 horas</option>
              <option value="3h">3 horas</option>
              <option value="4h">4 horas</option>
            </select>
          </div>

          {/* Note */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Observações</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              placeholder="Ex.: aniversário, reunião do bloco..."
              className={`${inputCls} resize-none`}
            />
          </div>

          {err && <p className="rounded-xl bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-600">{err}</p>}

          <button type="submit" disabled={saving}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition cursor-pointer">
            {saving ? "Salvando..." : "Confirmar agendamento"}
          </button>
        </div>

        {/* Right: calendar picker */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">
          {/* Month nav */}
          <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <button type="button"
              onClick={() => setCurrentMonth(m => addMonths(m, -1))}
              disabled={!canGoPrev}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <span className="text-base font-bold text-gray-900">
              {MONTHS_PT[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <button type="button"
              onClick={() => setCurrentMonth(m => addMonths(m, 1))}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="shrink-0 grid grid-cols-7 border-b border-gray-100">
            {WEEK_DAYS.map(d => (
              <div key={d} className="py-2 text-center text-[11px] font-bold uppercase tracking-wide text-gray-400">{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="flex-1 min-h-0 grid grid-cols-7 grid-rows-6 overflow-hidden">
            {grid.map((day, i) => {
              const key = toKey(day);
              const inMonth = isSameMonth(day, currentMonth);
              const isToday = key === todayKey;
              const isSelected = key === selectedDate;
              const isPast = startOfDay(day).getTime() < startOfDay(today).getTime();
              const disabled = !inMonth || isPast;

              return (
                <button
                  key={`${key}-${i}`}
                  type="button"
                  disabled={disabled}
                  onClick={() => !disabled && setSelectedDate(key)}
                  className={`relative flex flex-col border-b border-r border-gray-100 px-2 py-1.5 transition-colors ${
                    disabled
                      ? "bg-gray-50/60 cursor-default"
                      : isSelected
                        ? "bg-indigo-600 cursor-pointer"
                        : "hover:bg-indigo-50 cursor-pointer"
                  }`}
                >
                  <span className={`text-xs font-bold ${
                    !inMonth ? "text-gray-300"
                    : isSelected ? "text-white"
                    : isToday ? "text-indigo-600"
                    : isPast ? "text-gray-400"
                    : "text-gray-800"
                  }`}>
                    {day.getDate()}
                  </span>
                  {isToday && !isSelected && (
                    <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500" />
                  )}
                  {isSelected && (
                    <span className="mt-auto w-full rounded px-1 py-0.5 text-[10px] font-bold text-white/80 text-center">
                      ✓
                    </span>
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
