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

  return (
    <article className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="m-0 text-base font-semibold text-slate-950">{poll.title}</h3>
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${statusMeta.className}`}>
              {statusMeta.label}
            </span>
            {selectedOption ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                voce votou
              </span>
            ) : null}
          </div>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{poll.description || "Sem descricao adicional."}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{getAssemblyTypeLabel(poll.assemblyType)}</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{getModeLabel(poll.meetingMode)}</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{getScopeLabel(poll.scope)}</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">Quorum {poll.quorumMinPercent}%</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">Aprovacao {poll.approvalMinPercent}%</span>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:w-[420px]">
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Janela de votacao</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{formatDate(poll.votingStartsAt)} ate {formatDate(poll.votingEndsAt)}</p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Lider atual</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{winner?.text ?? "Sem definicao ainda"}</p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Sua escolha</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{selectedOption?.text ?? "Voce ainda nao votou"}</p>
          </div>
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Participacao</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{totalVotes} voto(s) e {poll.comments.length} comentario(s)</p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
        <div className="flex flex-wrap gap-2">
          {poll.options.map((option) => {
            const isSelected = option.id === selectedOptionId;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onVote(poll.id, option.id)}
                disabled={busyPollId === poll.id || poll.status !== "OPEN" || signing}
                className={`inline-flex items-center justify-center rounded-full border px-3 py-2 text-sm font-semibold transition ${
                  isSelected
                    ? "border-sky-300 bg-sky-50 text-sky-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {option.text}
              </button>
            );
          })}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onViewDetails(poll.id)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
          >
            Ver detalhes
          </button>
        </div>
      </div>
    </article>
  );
}
