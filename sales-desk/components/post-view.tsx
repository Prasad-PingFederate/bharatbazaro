import { useMemo, useState } from "react";
import { Check, Copy, Plus, Trash2 } from "lucide-react";
import { DEALS } from "@/lib/sales/catalog";
import { scoreAll } from "@/lib/sales/engine";
import { inr } from "@/lib/sales/format";
import { blurb, NETWORKS, openHref, placeFits, PLACES, type Network, type Place } from "@/lib/sales/places";
import { useDesk } from "@/lib/sales/store";

export function PostView() {
  const weights = useDesk((state) => state.weights);
  const dealId = useDesk((state) => state.dealId);
  const setDeal = useDesk((state) => state.setDeal);
  const groups = useDesk((state) => state.groups);
  const posted = useDesk((state) => state.posted);
  const togglePosted = useDesk((state) => state.togglePosted);
  const addStarterGroups = useDesk((state) => state.addStarterGroups);
  const addGroup = useDesk((state) => state.addGroup);
  const removeGroup = useDesk((state) => state.removeGroup);
  const scored = useMemo(() => scoreAll(DEALS, weights), [weights]);
  const row = scored.find((item) => item.deal.id === dealId) ?? scored[0];
  const [network, setNetwork] = useState<Network | "All">("All");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Network>("WhatsApp");
  const [copied, setCopied] = useState<string | null>(null);

  if (!row) return null;

  const places = [...PLACES, ...groups].filter(
    (place) => network === "All" || place.network === network,
  );
  const done = places.filter((place) => posted.includes(keyOf(row.deal.id, place.id))).length;

  function postPlace(place: Place) {
    const text = blurb(row, place.channel);
    const href = openHref(place, row, text);
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(place.id);
      window.setTimeout(() => setCopied(null), 1400);
    });
    if (href) window.open(href, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-5">
      <header className="max-w-2xl">
        <p className="text-sm font-medium text-primary">Get the click</p>
        <h1 className="mt-2 text-4xl text-fg">Post this deal into the groups you are already in.</h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          One click copies the deal and opens that app in this browser. If you are already logged
          in, the box is filled. WhatsApp, X, Reddit and Facebook still make you press Send. They
          do not let another site press it.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <label className="block text-sm text-muted">
          Deal to push
          <select
            value={row.deal.id}
            onChange={(event) => setDeal(event.target.value)}
            className="mt-1 min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-fg"
          >
            {scored.map((item) => (
              <option key={item.deal.id} value={item.deal.id}>
                {item.verdict} · {item.deal.brand} {item.deal.title} · {inr(item.effective)}
              </option>
            ))}
          </select>
        </label>
        <p className="font-display text-3xl tabular-nums text-fg">
          {done}
          <span className="text-muted">/{places.length}</span>
        </p>
      </div>

      {row.verdict === "kill" && (
        <p className="rounded-lg border border-line bg-surface p-4 text-sm text-muted">
          This one is killed (out of stock or the price spiked). Pick another deal or you will
          train every group to ignore you.
        </p>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        <Filter id="All" current={network} onPick={setNetwork} />
        {NETWORKS.map((item) => (
          <Filter key={item} id={item} current={network} onPick={setNetwork} />
        ))}
      </div>

      <ul className="space-y-2">
        {places.map((place) => {
          const fits = placeFits(place, row);
          const text = blurb(row, place.channel);
          const href = fits ? openHref(place, row, text) : null;
          const marked = posted.includes(keyOf(row.deal.id, place.id));
          return (
            <li key={place.id} className="rounded-lg border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-primary">{place.network}</p>
                  <h2 className="text-lg text-fg">{place.name}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {fits ? place.note : "Skip. This crowd does not want this category."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!fits || row.verdict === "kill"}
                    onClick={() => postPlace(place)}
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-fg disabled:opacity-40"
                  >
                    {copied === place.id ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
                    {copied === place.id ? "Copied, opening" : href ? "Post" : "Copy"}
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePosted(keyOf(row.deal.id, place.id))}
                    className={`inline-flex min-h-11 items-center rounded-lg px-3 text-sm ${
                      marked ? "bg-primary text-primary-fg" : "border border-line text-muted"
                    }`}
                  >
                    {marked ? "Posted" : "Mark posted"}
                  </button>
                  {place.custom && (
                    <button
                      type="button"
                      onClick={() => removeGroup(place.id)}
                      className="inline-flex min-h-11 items-center px-2 text-muted"
                      aria-label={`Remove ${place.name}`}
                    >
                      <Trash2 size={16} aria-hidden />
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <section className="rounded-lg border border-line p-4">
        <h2 className="text-2xl text-fg">Add the groups you can actually post in</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          Family, friends, a local buy-sell group, the Facebook group you already use. The tool
          will not join groups for you. A new account that only drops links gets banned before
          the first sale.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Group name"
            className="min-h-11 flex-1 rounded-lg border border-line bg-surface px-3 text-fg"
          />
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as Network)}
            className="min-h-11 rounded-lg border border-line bg-surface px-3 text-fg"
          >
            {NETWORKS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              addGroup(name, kind);
              setName("");
            }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-fg"
          >
            <Plus size={16} aria-hidden />
            Add
          </button>
        </div>
        {groups.length === 0 && (
          <button
            type="button"
            onClick={addStarterGroups}
            className="mt-3 min-h-11 text-sm text-primary"
          >
            Add family, friends, local buy-sell, and your own channel
          </button>
        )}
      </section>
    </div>
  );
}

function Filter({
  id,
  current,
  onPick,
}: {
  id: Network | "All";
  current: Network | "All";
  onPick: (id: Network | "All") => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(id)}
      className={`min-h-11 shrink-0 rounded-lg px-3 text-sm ${
        current === id ? "bg-primary text-primary-fg" : "border border-line text-muted"
      }`}
    >
      {id}
    </button>
  );
}

function keyOf(dealId: string, placeId: string) {
  return `${dealId}:${placeId}`;
}
