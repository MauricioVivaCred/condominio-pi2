import { Check, Clock3, MessageSquareText, TrendingUp, X } from "lucide-react";
import type { Poll } from "../../../features/enquetes/services/enquetes";
import { formatDate, getPollTotalVotes, getStatusMeta, getWinningOption, getAssemblyTypeLabel, getModeLabel, getScopeLabel } from "../utils/poll-calc";

type Props = {
  poll: Poll;
  voterId: string;
  busyPollId: string | null;
  signing: boolean;
  onVote: (pollId: string, optionId: string) => void;
  onViewDetails: (pollId: string) => void;
};

export function PollCard({ poll, voterId, busyPollId, signing, onVote, onViewDetails }: Props) {
  const totalVotes = getPollTotalVotes(poll);
  const selectedOptionId = poll.options.find((option) => option.votes.includes(voterId))?.id;
  const selectedOption = poll.options.find((option) => option.id === selectedOptionId) ?? null;
  const winner = getWinningOption(poll);
  const statusMeta = getStatusMeta(poll.status);
  const winnerVotes = winner?.votes.length ?? 0;
  const winnerPercentage = totalVotes > 0 ? Math.round((winnerVotes / totalVotes) * 100) : 0;
  const dateRange = `${formatDate(poll.votingStartsAt)} ate ${formatDate(poll.votingEndsAt)}`;

  return (
    <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_52px_-40px_rgba(15,23,42,0.32)]">
      <div className="h-1.5 bg-[linear-gradient(90deg,#0f766e_0%,#14b8a6_48%,#d1fae5_100%)]" />

      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="m-0 text-lg font-semibold tracking-[-0.03em] text-slate-950">{poll.title}</h3>
            <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${statusMeta.className}`}>
              {statusMeta.label}
            </span>
            {selectedOption ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                voce votou
              </span>
            ) : null}
          </div>

          <p className="mt-2.5 max-w-3xl text-sm leading-6 text-slate-600">{poll.description || "Sem descricao adicional."}</p>

          <div className="mt-3.5 flex flex-wrap gap-2">
            <span className="rounded-full border border-slate-200 bg-[#f8fafc] px-3 py-1.5 text-[11px] font-bold text-slate-600">{getAssemblyTypeLabel(poll.assemblyType)}</span>
            <span className="rounded-full border border-slate-200 bg-[#f8fafc] px-3 py-1.5 text-[11px] font-bold text-slate-600">{getModeLabel(poll.meetingMode)}</span>
            <span className="rounded-full border border-slate-200 bg-[#f8fafc] px-3 py-1.5 text-[11px] font-bold text-slate-600">{getScopeLabel(poll.scope)}</span>
            <span className="rounded-full border border-slate-200 bg-[#f8fafc] px-3 py-1.5 text-[11px] font-bold text-slate-600">Quorum {poll.quorumMinPercent}%</span>
            <span className="rounded-full border border-slate-200 bg-[#f8fafc] px-3 py-1.5 text-[11px] font-bold text-slate-600">Aprovacao {poll.approvalMinPercent}%</span>
          </div>

          <div className="mt-4 rounded-[20px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-slate-500">
                <TrendingUp size={14} />
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">Panorama da votacao</span>
              </div>
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                {winnerPercentage}% liderando
              </span>
            </div>

            <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
              <MetricCard label="Lider atual" value={winner?.text ?? "Sem definicao"} tone="text-emerald-700" />
              <MetricCard label="Participacao" value={`${totalVotes} voto(s)`} tone="text-slate-700" helper={`${poll.comments.length} comentario(s)`} />
              <MetricCard label="Sua escolha" value={selectedOption?.text ?? "Voce ainda nao votou"} tone="text-slate-700" />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {poll.options.slice(0, 2).map((option) => {
              const isSelected = option.id === selectedOptionId;
              const optionStyle = getOptionStyle(option.text, isSelected);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onVote(poll.id, option.id)}
                  disabled={busyPollId === poll.id || poll.status !== "OPEN" || signing}
                  className={`inline-flex min-w-[132px] items-center justify-center gap-2.5 rounded-2xl border px-4 py-2.5 text-base font-semibold transition ${optionStyle} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {getOptionIcon(option.text)}
                  {option.text}
                </button>
              );
            })}
          </div>
        </div>

        <aside className="border-t border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#eef6f5_100%)] p-4 sm:p-5 xl:border-t-0 xl:border-l">
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-1">
            <InfoPanel
              icon={<Clock3 size={16} />}
              label="Janela de votacao"
              value={dateRange}
              accent="border-cyan-200 bg-cyan-50/70"
            />
            <InfoPanel
              icon={<TrendingUp size={16} />}
              label="Resultado atual"
              value={winner?.text ?? "Sem definicao ainda"}
              helper={winner ? `${winnerVotes} voto(s)` : "Aguardando participacao"}
              accent="border-emerald-200 bg-emerald-50/70"
            />
          </div>

          <div className="mt-3 flex justify-start">
            <button
              type="button"
              onClick={() => onViewDetails(poll.id)}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800"
            >
              Ver detalhes
            </button>
          </div>
        </aside>
      </div>
    </article>
  );
}

function MetricCard({ label, value, tone, helper }: { label: string; value: string; tone: string; helper?: string }) {
  return (
    <div className="rounded-[14px] border border-slate-200 bg-white px-2.5 py-2 shadow-[0_14px_30px_-28px_rgba(15,23,42,0.4)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className={`mt-1 text-[0.96rem] font-semibold leading-5 ${tone}`}>{value}</p>
      {helper ? <p className="mt-1 text-[12px] text-slate-500">{helper}</p> : null}
    </div>
  );
}

function InfoPanel({
  icon,
  label,
  value,
  helper,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  helper?: string;
  accent: string;
}) {
  return (
    <div className={`rounded-[20px] border px-3.5 py-3.5 ${accent}`}>
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      </div>
      <p className="mt-1.5 text-sm font-semibold leading-6 text-slate-900">{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

function getOptionStyle(text: string, isSelected: boolean) {
  const normalized = normalizeOptionText(text);
  const isApprove = normalized.includes("aprova") || normalized === "sim";
  const isReject = normalized.includes("rejeita") || normalized === "rejeitar" || normalized === "nao" || normalized === "nao aprovar";

  if (isApprove) {
    return isSelected
      ? "border-emerald-300 bg-emerald-100 text-emerald-700 shadow-[0_18px_34px_-24px_rgba(4,120,87,0.22)]"
      : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100";
  }

  if (isReject) {
    return isSelected
      ? "border-rose-300 bg-rose-100 text-rose-700 shadow-[0_18px_34px_-24px_rgba(190,24,93,0.22)]"
      : "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100";
  }

  return isSelected
    ? "border-sky-700 bg-sky-700 text-white shadow-[0_18px_34px_-24px_rgba(3,105,161,0.8)]"
    : "border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700";
}

function getOptionIcon(text: string) {
  const normalized = normalizeOptionText(text);
  if (normalized.includes("aprova") || normalized === "sim") {
    return <Check size={18} />;
  }
  if (normalized.includes("rejeita") || normalized === "rejeitar" || normalized === "nao" || normalized === "nao aprovar") {
    return <X size={18} />;
  }
  return <MessageSquareText size={18} />;
}

function normalizeOptionText(text: string) {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
