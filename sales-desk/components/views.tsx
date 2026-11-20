import { useMemo, useState, type ReactNode } from "react";
import { Check, Copy, RotateCcw } from "lucide-react";
import { DEALS } from "@/lib/sales/catalog";
import { critique, draftFor } from "@/lib/sales/copy";
import {
  planHour,
  scoreAll,
  sequenceFor,
  verdictLabel,
} from "@/lib/sales/engine";
import { compact, inr, pct } from "@/lib/sales/format";
import { LESSONS, PARTNERS } from "@/lib/sales/plays";
import { channelLabel, useDesk } from "@/lib/sales/store";
import {
  CHANNELS,
  DEFAULT_WEIGHTS,
  type Scored,
  type Verdict,
} from "@/lib/sales/types";

function useScored() {
  const weights = useDesk((state) => state.weights);
  return useMemo(() => scoreAll(DEALS, weights), [weights]);
}

export function DeskView() {
  const scored = useScored();
  const queue = useDesk((state) => state.queue);
  const runHour = useDesk((state) => state.runHour);
  const setView = useDesk((state) => state.setView);
  const setDeal = useDesk((state) => state.setDeal);
  const plan = planHour(scored);
  const frontpage = scored.filter((row) => row.verdict === "frontpage").length;
  const ready = queue.filter((item) => item.status === "ready").length;
  const lead = scored.find((row) => row.verdict === "frontpage") ?? scored[0];

  return (
    <div className="space-y-8">
      <header className="max-w-2xl">
        <p className="text-sm font-medium text-primary">For BharatBazaro</p>
        <h1 className="mt-2 text-4xl text-fg md:text-5xl">Post the drop. Not the catalogue.</h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          Apollo, Instantly and Lemlist are built to book meetings with companies. This site
          wins when one verified price reaches someone who already wants it. The desk keeps
          their loop and throws out the cold email.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat k="Frontpage this hour" v={String(frontpage)} d="Cleared price, log, rating and stock." />
        <Stat k="Ready to send" v={String(ready)} d="Queued on this desk. Nothing sends itself." />
        <Stat k="Cap" v="6 deals" d="Same ceiling DealDash already uses per cycle." />
      </section>

      {lead && (
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <article className="rounded-lg border border-line bg-surface p-5">
            <p className="text-sm text-muted">Lead with this</p>
            <h2 className="mt-2 text-3xl text-fg">
              {lead.deal.brand} {lead.deal.title}
            </h2>
            <p className="mt-3 font-display text-4xl tabular-nums text-primary">
              {inr(lead.effective)}
            </p>
            <p className="mt-1 text-sm text-muted">
              MRP {inr(lead.deal.mrp)} · {pct(lead.discount)} off · score {lead.total}
            </p>
            <p className="mt-4 text-base leading-relaxed text-fg">{lead.hook}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Solid
                onClick={() => {
                  setDeal(lead.deal.id);
                  setView("post");
                }}
              >
                Post it everywhere
              </Solid>
              <Ghost onClick={() => runHour()}>Queue the hour</Ghost>
            </div>
          </article>
          <article className="rounded-lg border border-line bg-surface p-5">
            <p className="text-sm text-muted">If you run this hour</p>
            <ul className="mt-3 space-y-3">
              {plan.length === 0 && (
                <li className="text-sm text-muted">Nothing cleared the gate. Do not invent a post.</li>
              )}
              {plan.map((item) => {
                const row = scored.find((scoredRow) => scoredRow.deal.id === item.dealId);
                return (
                  <li key={`${item.dealId}-${item.channel}`} className="flex items-baseline justify-between gap-3">
                    <span className="text-sm text-fg">
                      <span className="text-muted">{item.due}</span>
                      {" · "}
                      {row?.deal.brand} on {channelLabel(item.channel)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </article>
        </section>
      )}

      <section>
        <h2 className="text-2xl text-fg">The loop, stolen cleanly</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {LOOP.map((step, index) => (
            <li key={step.title} className="rounded-lg border border-line bg-surface p-4">
              <p className="font-display text-2xl text-primary tabular-nums">0{index + 1}</p>
              <h3 className="mt-2 text-lg text-fg">{step.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{step.from}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-lg border border-line p-5">
        <h2 className="text-2xl text-fg">What this desk will not do</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          It will not scrape WhatsApp groups, buy a shopper list, or mail strangers a cooker.
          That is the Apollo motion, and it is the wrong product. Partners and owned alerts
          are the only outreach. Open Method for the tool-by-tool cut.
        </p>
        <div className="mt-4">
          <Ghost onClick={() => setView("method")}>Read the cut</Ghost>
        </div>
      </section>
    </div>
  );
}

const LOOP: { title: string; from: string }[] = [
  { title: "Signal", from: "A sighting from DealDash: price, coupon, stock, spike." },
  { title: "Waterfall", from: "Clay's rule. Fresh memory for price. Live page for stock. Never both if one is enough." },
  { title: "Score", from: "Slickdeals' content score, before anyone has voted." },
  { title: "Gate", from: "Frontpage, one test post, or silence. A kill vetoes everything." },
  { title: "Write", from: "Lemlist's idea of a fact in the sentence. The fact is the rupee." },
  { title: "Pace", from: "Instantly's fatigue control. Six deals. Forty-five minutes. Then stop." },
];

export function RadarView() {
  const scored = useScored();
  const dealId = useDesk((state) => state.dealId);
  const setDeal = useDesk((state) => state.setDeal);
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState(false);
  const visible = scored.filter((row) => matchFilter(row, filter));
  const current = scored.find((row) => row.deal.id === dealId) ?? visible[0] ?? scored[0];

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-4xl text-fg">Radar</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          Eight sample deals from one hour. The score is the content score. Drag a weight
          if you think the log should matter more than the discount.
        </p>
      </header>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`min-h-11 shrink-0 rounded-lg px-3 text-sm ${
              filter === item.id ? "bg-primary text-primary-fg" : "border border-line text-muted"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <ul className={`space-y-2 ${open ? "hidden lg:block" : ""}`}>
          {visible.length === 0 && (
            <li className="rounded-lg border border-line p-4 text-sm text-muted">
              Nothing in this cut. Try All.
            </li>
          )}
          {visible.map((row) => (
            <li key={row.deal.id}>
              <button
                type="button"
                onClick={() => {
                  setDeal(row.deal.id);
                  setOpen(true);
                }}
                className={`w-full rounded-lg border p-4 text-left ${
                  current?.deal.id === row.deal.id
                    ? "border-primary bg-surface"
                    : "border-line bg-surface"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted">
                      {row.deal.category} · {row.deal.brand}
                    </p>
                    <p className="mt-1 text-base text-fg">{row.deal.title}</p>
                  </div>
                  <VerdictPill verdict={row.verdict} />
                </div>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <p className="font-display text-2xl tabular-nums text-fg">{inr(row.effective)}</p>
                  <p className="text-sm tabular-nums text-muted">
                    {pct(row.discount)} · {row.total}
                  </p>
                </div>
                <Meter value={row.total} />
              </button>
            </li>
          ))}
        </ul>
        {current && (
          <div className={open ? "block" : "hidden lg:block"}>
            <Inspector
              row={current}
              onBack={() => setOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Inspector({ row, onBack }: { row: Scored; onBack: () => void }) {
  const weights = useDesk((state) => state.weights);
  const setWeight = useDesk((state) => state.setWeight);
  const resetWeights = useDesk((state) => state.resetWeights);
  const setView = useDesk((state) => state.setView);
  const setDeal = useDesk((state) => state.setDeal);
  const setChannel = useDesk((state) => state.setChannel);

  return (
    <aside className="space-y-4 lg:sticky lg:top-6">
      <button type="button" onClick={onBack} className="min-h-11 text-sm text-muted lg:hidden">
        Back to the list
      </button>
      <div className="rounded-lg border border-line bg-surface p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted">{row.deal.brand}</p>
            <h2 className="text-2xl text-fg">{row.deal.title}</h2>
          </div>
          <p className="font-display text-4xl tabular-nums text-primary">{row.total}</p>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted">{row.hook}</p>
        <div className="mt-4">
          <Solid
            onClick={() => {
              setDeal(row.deal.id);
              setChannel(row.verdict === "hold" ? "seo" : "telegram");
              setView("studio");
            }}
          >
            Write this deal
          </Solid>
        </div>
      </div>

      <div className="rounded-lg border border-line bg-surface p-4">
        <h3 className="text-lg text-fg">Waterfall</h3>
        <ol className="mt-3 space-y-3">
          {row.steps.map((step, index) => (
            <li key={step.id} className="border-t border-line pt-3 first:border-t-0 first:pt-0">
              <p className="text-sm text-fg">
                <span className="tabular-nums text-muted">0{index + 1}</span> {step.field}
              </p>
              <p className="mt-1 text-sm text-primary">{step.value}</p>
              <p className="mt-1 text-sm text-muted">
                {step.source}. {step.rule}
              </p>
              {!step.confident && (
                <p className="mt-1 text-sm text-muted">Thin. Do not lean on this column.</p>
              )}
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-lg border border-line bg-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg text-fg">Weights</h3>
          <button
            type="button"
            onClick={resetWeights}
            className="inline-flex min-h-11 items-center gap-2 text-sm text-muted"
          >
            <RotateCcw size={14} aria-hidden />
            Reset
          </button>
        </div>
        <ul className="mt-2 space-y-3">
          {row.parts.map((part) => (
            <li key={part.key}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-fg">{part.label}</span>
                <span className="tabular-nums text-muted">
                  {part.points}/{part.max}
                </span>
              </div>
              <Meter value={part.max === 0 ? 0 : (part.points / part.max) * 100} />
              <label className="mt-1 block text-sm text-muted">
                <span className="sr-only">{part.label} weight</span>
                <input
                  type="range"
                  min={0}
                  max={WEIGHT_MAX[part.key]}
                  value={weights[part.key]}
                  onChange={(event) => setWeight(part.key, Number(event.target.value))}
                  className="w-full"
                />
              </label>
              <p className="text-sm leading-relaxed text-muted">{part.note}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted">
          Defaults sum to 100. Depth {DEFAULT_WEIGHTS.depth}, log {DEFAULT_WEIGHTS.low}, proof{" "}
          {DEFAULT_WEIGHTS.trust}.
        </p>
      </div>
    </aside>
  );
}

export function StudioView() {
  const scored = useScored();
  const dealId = useDesk((state) => state.dealId);
  const channel = useDesk((state) => state.channel);
  const setDeal = useDesk((state) => state.setDeal);
  const setChannel = useDesk((state) => state.setChannel);
  const queueOne = useDesk((state) => state.queueOne);
  const setView = useDesk((state) => state.setView);
  const row = scored.find((item) => item.deal.id === dealId) ?? scored[0];
  const draft = draftFor(row, channel);
  const checks = critique(row, channel, draft.body);
  const [copied, setCopied] = useState(false);
  const blocked = row.verdict === "kill" && channel !== "seo";

  return (
    <div className="space-y-4">
      <header className="max-w-2xl">
        <h1 className="text-4xl text-fg">Studio</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Every draft links to bharatbazaro.com. The Amazon hop happens on your page, where
          the alert lives. A raw affiliate link builds Amazon, not you.
        </p>
      </header>
      <label className="block max-w-md text-sm text-muted">
        Deal
        <select
          value={row.deal.id}
          onChange={(event) => setDeal(event.target.value)}
          className="mt-1 min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-fg"
        >
          {scored.map((item) => (
            <option key={item.deal.id} value={item.deal.id}>
              {verdictLabel(item.verdict)} · {item.deal.brand} {item.deal.title} · {inr(item.effective)}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CHANNELS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setChannel(item.id)}
            className={`min-h-11 shrink-0 rounded-lg px-3 text-sm ${
              channel === item.id ? "bg-primary text-primary-fg" : "border border-line text-muted"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted">{CHANNELS.find((item) => item.id === channel)?.hint}</p>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="rounded-lg border border-line bg-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg text-fg">{draft.kicker}</h2>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(draft.body).then(() => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1600);
                });
              }}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line px-3 text-sm text-fg"
            >
              {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <textarea
            readOnly
            value={draft.body}
            className="mt-3 min-h-80 w-full resize-y rounded-lg border border-line bg-bg p-4 text-sm leading-relaxed text-fg"
          />
          <p className="mt-3 text-sm text-muted">{draft.note}</p>
        </div>
        <div className="space-y-3">
          <div className="rounded-lg border border-line bg-surface p-4">
            <h2 className="text-lg text-fg">Critic</h2>
            <ul className="mt-3 space-y-2">
              {checks.map((check) => (
                <li key={check.label} className="text-sm leading-relaxed text-fg">
                  <span className={check.ok ? "text-primary" : "text-muted"}>
                    {check.ok ? "Pass" : "Fix"}
                  </span>
                  {" · "}
                  {check.label}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-line bg-surface p-4">
            <p className="text-sm text-muted">
              {row.deal.rating.toFixed(1)} stars · {compact(row.deal.reviews)} ratings · seen{" "}
              {row.deal.seenHoursAgo}h ago
            </p>
            <div className="mt-3">
              {blocked ? (
                <p className="text-sm text-muted">
                  Killed deals do not get a channel. Fix the page, or wait for stock.
                </p>
              ) : (
                <Solid
                  onClick={() => {
                    queueOne(row.deal.id, channel, "When you say");
                    setView("routes");
                  }}
                >
                  Queue {channelLabel(channel)}
                </Solid>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RoutesView() {
  const scored = useScored();
  const dealId = useDesk((state) => state.dealId);
  const setDeal = useDesk((state) => state.setDeal);
  const queue = useDesk((state) => state.queue);
  const markSent = useDesk((state) => state.markSent);
  const removeItem = useDesk((state) => state.removeItem);
  const clearQueue = useDesk((state) => state.clearQueue);
  const runHour = useDesk((state) => state.runHour);
  const row = scored.find((item) => item.deal.id === dealId) ?? scored[0];
  const steps = sequenceFor(row);
  const [partnerId, setPartnerId] = useState(PARTNERS[0]?.id ?? "");
  const partner = PARTNERS.find((item) => item.id === partnerId) ?? PARTNERS[0];

  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <h1 className="text-4xl text-fg">Routes</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          A sequence is for a deal. A partner route is for a person who already talks to
          shoppers. Three touches, then stop. That is the Lemlist lesson without the spam.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-surface p-4">
          <label className="block text-sm text-muted">
            Sequence for
            <select
              value={row.deal.id}
              onChange={(event) => setDeal(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-fg"
            >
              {scored.map((item) => (
                <option key={item.deal.id} value={item.deal.id}>
                  {verdictLabel(item.verdict)} · {item.deal.brand} {item.deal.title}
                </option>
              ))}
            </select>
          </label>
          <ol className="mt-4 space-y-4">
            {steps.map((step) => (
              <li key={step.due + step.title}>
                <p className="text-sm text-primary">{step.due}</p>
                <h3 className="text-lg text-fg">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{step.detail}</p>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-lg border border-line bg-surface p-4">
          <h2 className="text-lg text-fg">Where it can go</h2>
          <div className="mt-3 flex flex-col gap-2">
            {PARTNERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPartnerId(item.id)}
                className={`min-h-11 rounded-lg border px-3 text-left text-sm ${
                  partner?.id === item.id ? "border-primary text-fg" : "border-line text-muted"
                }`}
              >
                {item.name}
                <span className="text-muted"> · {item.kind}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {partner && (
        <section className="rounded-lg border border-line bg-surface p-4">
          <p className="text-sm text-primary">{partner.kind}</p>
          <h2 className="mt-1 text-2xl text-fg">{partner.name}</h2>
          <p className="mt-2 text-sm leading-relaxed text-fg">{partner.fit}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">{partner.rule}</p>
          <ol className="mt-4 grid gap-3 md:grid-cols-3">
            {partner.touches.map((touch) => (
              <li key={touch.title} className="rounded-lg border border-line p-3">
                <p className="text-sm text-primary">{touch.when}</p>
                <h3 className="mt-1 text-lg text-fg">{touch.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{touch.body}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="rounded-lg border border-line p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl text-fg">Queue</h2>
          <div className="flex flex-wrap gap-2">
            <Ghost onClick={() => runHour()}>Queue the hour</Ghost>
            <Ghost onClick={clearQueue}>Clear</Ghost>
          </div>
        </div>
        <ul className="mt-3 space-y-2">
          {queue.length === 0 && (
            <li className="text-sm text-muted">Empty. Run the hour, or queue one draft from Studio.</li>
          )}
          {queue.map((item) => {
            const deal = DEALS.find((rowDeal) => rowDeal.id === item.dealId);
            return (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-2"
              >
                <div>
                  <p className="text-sm text-fg">
                    {deal?.brand} {deal?.title}
                  </p>
                  <p className="text-sm text-muted">
                    {channelLabel(item.channel)} · {item.due} · {item.status === "sent" ? "Sent" : "Ready"}
                  </p>
                </div>
                <div className="flex gap-2">
                  {item.status === "ready" && (
                    <button
                      type="button"
                      onClick={() => markSent(item.id)}
                      className="min-h-11 rounded-lg bg-primary px-3 text-sm text-primary-fg"
                    >
                      Mark sent
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="min-h-11 px-2 text-sm text-muted"
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

export function MethodView() {
  const setView = useDesk((state) => state.setView);
  return (
    <div className="space-y-8">
      <header className="max-w-2xl">
        <h1 className="text-4xl text-fg">Method</h1>
        <p className="mt-2 text-base leading-relaxed text-muted">
          Late 2026, the tools people call a sales engine are Clay, Instantly, Lemlist and
          Apollo. I read how they actually work, then kept only the parts that move a deal
          site. Prices below are public starting points, rounded.
        </p>
      </header>
      <div className="space-y-3">
        {LESSONS.map((lesson) => (
          <article key={lesson.tool} className="rounded-lg border border-line bg-surface p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-2xl text-fg">{lesson.tool}</h2>
              <p className="text-sm text-muted">{lesson.cost}</p>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-fg">
              <span className="text-primary">Steal. </span>
              {lesson.steal}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              <span className="text-fg">Leave. </span>
              {lesson.leave}
            </p>
          </article>
        ))}
      </div>
      <section className="max-w-2xl space-y-3">
        <h2 className="text-2xl text-fg">How DealDash plugs in</h2>
        <p className="text-sm leading-relaxed text-muted">
          The bot already verifies, scores roughly, and posts to Telegram. Put this gate in
          front of the caption call. If the verdict is hold or kill, do not spend a model
          token and do not spend the channel. Frontpage deals get the 45 minute second
          step. Test deals get one post. The link in that post is the bazaar page, so the
          hour also grows the site.
        </p>
        <p className="text-sm leading-relaxed text-muted">
          The list that compounds is alerts: budget and category, asked for, easy to leave.
          That is Honey's real asset. Channels are how you earn the first yes.
        </p>
        <Ghost onClick={() => setView("radar")}>Score an hour</Ghost>
      </section>
    </div>
  );
}

function Stat({ k, v, d }: { k: string; v: string; d: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <p className="text-sm text-muted">{k}</p>
      <p className="mt-1 font-display text-3xl text-fg">{v}</p>
      <p className="mt-1 text-sm text-muted">{d}</p>
    </div>
  );
}

function Meter({ value }: { value: number }) {
  return (
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-raised">
      <div className="h-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

function VerdictPill({ verdict }: { verdict: Verdict }) {
  const hot = verdict === "frontpage";
  return (
    <span
      className={`rounded-lg px-2 py-1 text-xs ${
        hot ? "bg-primary text-primary-fg" : "border border-line text-muted"
      }`}
    >
      {verdictLabel(verdict)}
    </span>
  );
}

function Solid({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-fg"
    >
      {children}
    </button>
  );
}

function Ghost({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line px-4 text-sm text-fg"
    >
      {children}
    </button>
  );
}

type Filter = "all" | Verdict | "under999";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "frontpage", label: "Frontpage" },
  { id: "test", label: "Test" },
  { id: "hold", label: "Hold" },
  { id: "kill", label: "Kill" },
  { id: "under999", label: "Under ₹999" },
];

const WEIGHT_MAX = {
  depth: 40,
  low: 30,
  trust: 30,
  fresh: 20,
  stock: 20,
  coupon: 15,
  social: 15,
} as const;

function matchFilter(row: Scored, filter: Filter) {
  if (filter === "all") return true;
  if (filter === "under999") return row.effective <= 999;
  return row.verdict === filter;
}
