import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, CalendarDays, ChevronLeft, ChevronRight, Droplet, Users } from "lucide-react";
import AppLayout from "../../features/layout/components/app-layout";
import { getUser } from "../../features/auth/services/auth";
import {
  listResourceBookings,
  subscribeToResourceBookings,
  type ResourceBooking,
} from "../../features/agendamentos/services/agendamentos";

type Resource = {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const RESOURCES: Resource[] = [
  { id: "salao",   label: "Salão de Festas",   icon: Users },
  { id: "piscina", label: "Piscina",            icon: Droplet },
  { id: "reuniao", label: "Sala de Reuniões",   icon: CalendarCheck },
];

const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS_PT = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

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

function fmtMonthYear(d: Date) {
  return `${MONTHS_PT[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtDateCard(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
}

function resourceLabel(id: string) {
  return RESOURCES.find(r => r.id === id)?.label ?? id;
}

export default function Agendamentos() {
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toKey(today), [today]);
  const currentUser = useMemo(() => getUser(), []);

  const [currentMonth, setCurrentMonth] = useState(startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedResource, setSelectedResource] = useState(RESOURCES[0].id);
  const [bookings, setBookings] = useState<ResourceBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileTab, setMobileTab] = useState<"cal" | "list">("cal");

  async function load() {
    setLoading(true);
    try { setBookings(await listResourceBookings()); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    void load();
    return subscribeToResourceBookings(() => void load());
  }, []);

  const resourceBookings = useMemo(
    () => bookings.filter(b => b.resourceId === selectedResource),
    [bookings, selectedResource],
  );

  const byDate = useMemo(() => {
    const m = new Map<string, ResourceBooking>();
    for (const b of resourceBookings) m.set(b.date, b);
    return m;
  }, [resourceBookings]);

  const listBookings = useMemo(() => {
    if (selectedDate) {
      const b = byDate.get(selectedDate);
      return b ? [b] : [];
    }
    const todayStart = startOfDay(today).getTime();
    return resourceBookings
      .filter(b => new Date(`${b.date}T12:00:00`).getTime() >= todayStart)
      .slice(0, 50);
  }, [resourceBookings, byDate, selectedDate, today]);

  const grid = useMemo(() => buildGrid(currentMonth), [currentMonth]);
  const canGoPrev = startOfMonth(currentMonth).getTime() > startOfMonth(today).getTime();

  function selectDay(d: Date) {
    const key = toKey(d);
    setSelectedDate(prev => prev === key ? null : key);
  }

  // ── Left panel ──────────────────────────────────────────────────────────────
  function BookingList() {
    return (
      <>
        <div className="shrink-0 px-5 py-4 border-b border-gray-100">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-500 mb-1">
            {selectedDate
              ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString("pt-BR", { weekday:"long", day:"2-digit", month:"long" })
              : "Próximos agendamentos"}
          </p>
          <h3 className="text-base font-bold text-gray-900">Agendamentos</h3>
          <p className="text-xs text-gray-400 mt-0.5">Não perca os eventos agendados</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading && (
            <div className="flex justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-500" />
            </div>
          )}

          {!loading && listBookings.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <CalendarDays size={24} className="text-gray-200" />
              <p className="text-xs text-gray-400">
                {selectedDate ? "Nenhum agendamento neste dia." : "Nenhum agendamento futuro."}
              </p>
            </div>
          )}

          {listBookings.map(b => (
            <div key={b.id}
              onClick={() => setSelectedDate(b.date)}
              className="cursor-pointer rounded-xl border border-gray-100 bg-white p-4 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-gray-900 leading-tight">{resourceLabel(b.resourceId)}</span>
                <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600">
                  {b.time}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{b.authorName}</p>
              <div className="flex items-center gap-1.5 mt-2 text-[11px] text-gray-400">
                <CalendarDays size={11} />
                <span>{fmtDateCard(b.date)}</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">{b.duration}</p>
              {b.note && <p className="mt-2 text-[11px] text-gray-500 line-clamp-2">{b.note}</p>}
              {b.userId === currentUser?.id && (
                <span className="mt-2 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                  Minha reserva
                </span>
              )}
            </div>
          ))}
        </div>
      </>
    );
  }

  // ── Calendar panel ───────────────────────────────────────────────────────────
  function CalendarPanel() {
    return (
      <>
        {/* Header */}
        <div className="shrink-0 flex flex-col gap-3 px-5 py-4 border-b border-gray-100 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentMonth(m => addMonths(m, -1))}
              disabled={!canGoPrev}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="min-w-[160px] text-center text-base font-bold text-gray-900">
              {fmtMonthYear(currentMonth)}
            </span>
            <button
              onClick={() => setCurrentMonth(m => addMonths(m, 1))}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
            <button
              onClick={() => { setCurrentMonth(startOfMonth(today)); setSelectedDate(todayKey); }}
              className="ml-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 transition-colors"
            >
              Hoje
            </button>
          </div>

          {/* Resource tabs */}
          <div className="flex gap-1">
            {RESOURCES.map(r => {
              const Icon = r.icon;
              return (
                <button
                  key={r.id}
                  onClick={() => { setSelectedResource(r.id); setSelectedDate(null); }}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    selectedResource === r.id
                      ? "bg-indigo-600 text-white"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  <Icon size={13} />
                  <span className="hidden sm:inline">{r.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Weekday headers */}
        <div className="shrink-0 grid grid-cols-7 border-b border-gray-100">
          {WEEK_DAYS.map(d => (
            <div key={d} className="py-2 text-center text-[11px] font-bold uppercase tracking-wide text-gray-400">
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 min-h-0 grid grid-cols-7 grid-rows-6 overflow-hidden">
          {grid.map((day, i) => {
            const key = toKey(day);
            const inMonth = isSameMonth(day, currentMonth);
            const isToday = key === todayKey;
            const isSelected = key === selectedDate;
            const booking = byDate.get(key);
            const isPast = startOfDay(day).getTime() < startOfDay(today).getTime();
            const isOwnBooking = booking?.userId === currentUser?.id;

            return (
              <button
                key={`${key}-${i}`}
                type="button"
                onClick={() => inMonth && selectDay(day)}
                className={`relative flex flex-col items-start border-b border-r border-gray-100 px-2 py-1.5 text-left transition-colors last:border-r-0 ${
                  !inMonth
                    ? "bg-gray-50/60 cursor-default"
                    : isSelected
                      ? "bg-indigo-600 cursor-pointer"
                      : isPast
                        ? "bg-gray-50 cursor-default"
                        : "hover:bg-indigo-50/50 cursor-pointer"
                }`}
              >
                <span className={`text-xs font-bold leading-none ${
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

                {booking && inMonth && (
                  <div className={`mt-auto w-full rounded px-1 py-0.5 text-[10px] font-semibold truncate leading-tight ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : isOwnBooking
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-700"
                  }`}>
                    {booking.time} · {booking.authorName.split(" ")[0]}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <AppLayout title="Agendamentos">
      {/* Mobile tab switcher */}
      <div className="mb-3 flex gap-2 md:hidden">
        {(["cal","list"] as const).map(tab => (
          <button key={tab} onClick={() => setMobileTab(tab)}
            className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-colors ${mobileTab===tab ? "bg-indigo-600 text-white" : "bg-white border border-gray-200 text-gray-600"}`}>
            {tab === "cal" ? "Calendário" : "Lista"}
          </button>
        ))}
      </div>

      {/* Desktop: two-column, full height */}
      <div className="hidden md:flex h-full gap-4 overflow-hidden">
        {/* Left */}
        <div className="w-72 shrink-0 flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
          <BookingList />
        </div>
        {/* Right */}
        <div className="flex-1 flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <CalendarPanel />
        </div>
      </div>

      {/* Mobile: single panel based on tab */}
      <div className="md:hidden flex flex-col h-full overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {mobileTab === "cal"
          ? <CalendarPanel />
          : <div className="flex flex-col h-full overflow-hidden bg-gray-50"><BookingList /></div>
        }
      </div>
    </AppLayout>
  );
}
