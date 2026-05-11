import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  FileText,
  MessageSquare,
  PlusCircle,
  Sparkles,
  Users,
  Vote,
} from "lucide-react";
import AppLayout from "../../features/layout/components/app-layout";
import { getUser } from "../../features/auth/services/auth";
import {
  addPollComment,
  createPoll,
  listPollSignatures,
  listPolls,
  subscribeToPolls,
  updatePollStatus,
  voteOnPoll,
  type Poll,
  type PollSignatureLog,
} from "../../features/enquetes/services/enquetes";
import { getPollTotalVotes } from "./utils/poll-calc";
import { buildMinutesDocument } from "./utils/minutes-builder";
import { PollCard } from "./components/poll-card";
import { PollFormModal, emptyCreatePollDraft, type CreatePollDraft } from "./components/poll-form-modal";
import { VoteSignatureModal } from "./components/vote-signature-modal";
import { PollDetailModal } from "./components/poll-detail-modal";

export default function EnquetesPage() {
  const user = getUser();
  const voterId = String(user?.id ?? user?.email?.trim().toLowerCase() ?? "anonimo");
  const canManage = user?.role === "ADMIN";

  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<CreatePollDraft>(emptyCreatePollDraft());
  const [creating, setCreating] = useState(false);

  const [selectedPollId, setSelectedPollId] = useState<string | null>(null);
  const [minutesDraft, setMinutesDraft] = useState("");
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [signatureLogs, setSignatureLogs] = useState<PollSignatureLog[]>([]);
  const [loadingSignatureLogs, setLoadingSignatureLogs] = useState(false);

  const [voteSignatureOpen, setVoteSignatureOpen] = useState(false);
  const [voteSignatureDataUrl, setVoteSignatureDataUrl] = useState("");
  const [pendingVote, setPendingVote] = useState<{ pollId: string; optionId: string } | null>(null);

  const [busyPollId, setBusyPollId] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);

  const load = useCallback(async () => {
    try {
      const nextPolls = await listPolls();
      setPolls(nextPolls);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar as assembleias.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => { if (!active) return; await load(); })();
    const unsubscribe = subscribeToPolls(() => { if (!active) return; void load(); });
    return () => { active = false; unsubscribe(); };
  }, [load]);

  const selectedPoll = selectedPollId ? polls.find((p) => p.id === selectedPollId) ?? null : null;

  useEffect(() => { setMinutesDraft(selectedPoll?.minutesSummary ?? ""); }, [selectedPoll?.id, selectedPoll?.minutesSummary]);

  useEffect(() => {
    let active = true;
    if (!selectedPoll?.id) { setSignatureLogs([]); return () => { active = false; }; }
    setLoadingSignatureLogs(true);
    void listPollSignatures(selectedPoll.id)
      .then((logs) => { if (active) setSignatureLogs(logs); })
      .catch(() => { if (active) setSignatureLogs([]); })
      .finally(() => { if (active) setLoadingSignatureLogs(false); });
    return () => { active = false; };
  }, [selectedPoll?.id]);

  const stats = useMemo(() => ({
    totalAssemblies: polls.length,
    totalVotes: polls.reduce((sum, p) => sum + getPollTotalVotes(p), 0),
    totalComments: polls.reduce((sum, p) => sum + p.comments.length, 0),
    openAssemblies: polls.filter((p) => p.status === "OPEN").length,
    participated: polls.filter((p) => p.options.some((o) => o.votes.includes(voterId))).length,
  }), [polls, voterId]);

  async function handleCreatePoll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating) return;
    const options = [createDraft.optionA, createDraft.optionB, createDraft.optionC].map((v) => v.trim()).filter(Boolean);
    const missing: string[] = [];
    if (!createDraft.title.trim()) missing.push("Título");
    if (!createDraft.description.trim()) missing.push("Descrição");
    if (options.length < 2) missing.push("Pelo menos 2 opções");
    if (!createDraft.votingStartsAt) missing.push("Início da votação");
    if (!createDraft.votingEndsAt) missing.push("Fim da votação");
    if (missing.length > 0) { setError(`Preencha: ${missing.join(", ")}.`); return; }

    let signatureUpload: File | null = createDraft.signatureFile;
    if (!signatureUpload && createDraft.signatureDataUrl) {
      const blob = await (await fetch(createDraft.signatureDataUrl)).blob();
      signatureUpload = new File([blob], `signature-${Date.now()}.png`, { type: "image/png" });
    }

    try {
      setCreating(true);
      setError("");
      setInfo("");
      await createPoll({
        title: createDraft.title,
        description: createDraft.description,
        options,
        assemblyType: createDraft.assemblyType,
        meetingMode: createDraft.meetingMode,
        scope: createDraft.scope,
        status: createDraft.status,
        meetingAt: createDraft.meetingAt ? new Date(createDraft.meetingAt).toISOString() : null,
        votingStartsAt: createDraft.votingStartsAt ? new Date(createDraft.votingStartsAt).toISOString() : new Date().toISOString(),
        votingEndsAt: createDraft.votingEndsAt ? new Date(createDraft.votingEndsAt).toISOString() : null,
        quorumMinPercent: Number(createDraft.quorumMinPercent),
        approvalMinPercent: Number(createDraft.approvalMinPercent),
        allowComments: createDraft.allowComments,
        attachmentFile: createDraft.attachmentFile,
        signatureFile: signatureUpload,
      });
      setCreateDraft(emptyCreatePollDraft());
      setCreateOpen(false);
      setInfo("Assembleia criada com sucesso.");
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel criar a assembleia.");
    } finally {
      setCreating(false);
    }
  }

  function handleVote(pollId: string, optionId: string) {
    setPendingVote({ pollId, optionId });
    setVoteSignatureDataUrl("");
    setVoteSignatureOpen(true);
    setError("Assinatura obrigatoria para registrar o voto.");
  }

  async function confirmPendingVote() {
    if (!pendingVote || !voteSignatureDataUrl) { setError("Assine para confirmar seu voto."); return; }
    try {
      setBusyPollId(pendingVote.pollId);
      setSigning(true);
      setError("");
      setInfo("");
      const signatureBlob = await (await fetch(voteSignatureDataUrl)).blob();
      const signatureFile = new File([signatureBlob], `vote-signature-${Date.now()}.png`, { type: "image/png" });
      await voteOnPoll(pendingVote.pollId, pendingVote.optionId, signatureFile);
      setPolls((current) =>
        current.map((poll) =>
          poll.id !== pendingVote.pollId ? poll : {
            ...poll,
            options: poll.options.map((opt) =>
              opt.id === pendingVote.optionId
                ? { ...opt, votes: Array.from(new Set([...opt.votes, voterId])) }
                : { ...opt, votes: opt.votes.filter((v) => v !== voterId) },
            ),
          },
        ),
      );
      setInfo("Voto registrado.");
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel registrar seu voto.");
    } finally {
      setSigning(false);
      setBusyPollId(null);
      setPendingVote(null);
      setVoteSignatureOpen(false);
      setVoteSignatureDataUrl("");
    }
  }

  async function handleCommentSubmit(pollId: string) {
    const message = (commentDrafts[pollId] ?? "").trim();
    if (!message) return;
    try {
      setBusyPollId(pollId);
      setError("");
      await addPollComment(pollId, message);
      setCommentDrafts((current) => ({ ...current, [pollId]: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel comentar nesta assembleia.");
    } finally {
      setBusyPollId(null);
    }
  }

  async function handleCloseAssembly(pollId: string) {
    try {
      setBusyPollId(pollId);
      setError("");
      await updatePollStatus(pollId, "CLOSED", minutesDraft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel encerrar a assembleia.");
    } finally {
      setBusyPollId(null);
    }
  }

  function handlePrintMinutes(poll: Poll) {
    const printWindow = window.open("", "_blank", "width=980,height=760");
    if (!printWindow) { setError("Nao foi possivel abrir a janela de impressao."); return; }
    const documentContent = buildMinutesDocument({
      ...poll,
      minutesSummary: poll.id === selectedPollId ? minutesDraft : poll.minutesSummary,
      creatorSignatureUrl: poll.creatorSignatureUrl || createDraft.signatureDataUrl || null,
      creatorSignatureName: poll.creatorSignatureName || user?.name || poll.createdBy,
    });
    printWindow.document.open();
    printWindow.document.write(documentContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <AppLayout title="Assembleia Digital">
      <div className="space-y-5">
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div>
        ) : null}

        <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                <Sparkles size={13} />
                Deliberacoes do condominio
              </div>
              <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">Assembleia digital</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Use esta area para convocar assembleias, abrir a janela de votacao, colher manifestacoes dos moradores e encerrar com uma ata resumida.
              </p>
            </div>
            {canManage && (
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <PlusCircle size={16} />
                Nova assembleia
              </button>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {[
              { icon: FileText, label: "Assembleias", value: String(stats.totalAssemblies), tone: "border-sky-100 bg-sky-50 text-sky-700" },
              { icon: Vote, label: "Votos", value: String(stats.totalVotes), tone: "border-slate-200 bg-slate-50 text-slate-700" },
              { icon: Users, label: "Abertas", value: String(stats.openAssemblies), tone: "border-amber-100 bg-amber-50 text-amber-700" },
              { icon: CheckCircle2, label: "Sua participacao", value: String(stats.participated), tone: "border-emerald-100 bg-emerald-50 text-emerald-700" },
              { icon: MessageSquare, label: "Comentarios", value: String(stats.totalComments), tone: "border-slate-200 bg-slate-50 text-slate-700" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className={`inline-flex items-center gap-3 rounded-full border px-4 py-2.5 ${item.tone}`}>
                  <Icon size={15} />
                  <span className="text-xs font-semibold uppercase tracking-[0.16em]">{item.label}</span>
                  <span className="text-sm font-bold">{item.value}</span>
                </div>
              );
            })}
          </div>
        </section>

        {info && <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{info}</p>}

        <section className="space-y-3">
          {loading ? (
            <div className="rounded-[30px] border border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500 shadow-sm">
              Carregando assembleias...
            </div>
          ) : null}
          {!loading && polls.length === 0 ? (
            <div className="rounded-[30px] border border-dashed border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500 shadow-sm">
              Nenhuma assembleia criada ainda.
            </div>
          ) : null}
          {polls.map((poll) => (
            <PollCard
              key={poll.id}
              poll={poll}
              voterId={voterId}
              busyPollId={busyPollId}
              signing={signing}
              onVote={handleVote}
              onViewDetails={setSelectedPollId}
            />
          ))}
        </section>
      </div>

      <PollFormModal
        open={createOpen}
        draft={createDraft}
        setDraft={setCreateDraft}
        creating={creating}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreatePoll}
      />

      <VoteSignatureModal
        open={voteSignatureOpen}
        signatureDataUrl={voteSignatureDataUrl}
        onSignatureChange={setVoteSignatureDataUrl}
        signing={signing}
        onCancel={() => { setVoteSignatureOpen(false); setPendingVote(null); }}
        onConfirm={() => void confirmPendingVote()}
      />

      <PollDetailModal
        poll={selectedPoll}
        voterId={voterId}
        canManage={canManage}
        busyPollId={busyPollId}
        signing={signing}
        signatureLogs={signatureLogs}
        loadingSignatureLogs={loadingSignatureLogs}
        minutesDraft={minutesDraft}
        onMinutesDraftChange={setMinutesDraft}
        commentDrafts={commentDrafts}
        onCommentDraftChange={(pollId, value) => setCommentDrafts((c) => ({ ...c, [pollId]: value }))}
        onVote={handleVote}
        onCommentSubmit={handleCommentSubmit}
        onCloseAssembly={handleCloseAssembly}
        onPrintMinutes={handlePrintMinutes}
        onClose={() => setSelectedPollId(null)}
      />
    </AppLayout>
  );
}
