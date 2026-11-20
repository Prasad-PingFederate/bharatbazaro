import { create } from "zustand";
import { persist } from "zustand/middleware";
import { STARTER_GROUPS, type Place } from "@/lib/sales/places";
import { DEALS } from "@/lib/sales/catalog";
import { planHour, scoreAll } from "@/lib/sales/engine";
import {
  CHANNELS,
  DEFAULT_WEIGHTS,
  type Channel,
  type QueueItem,
  type ViewId,
  type Weights,
} from "@/lib/sales/types";

type DeskState = {
  view: ViewId;
  dealId: string;
  channel: Channel;
  weights: Weights;
  queue: QueueItem[];
  posted: string[];
  groups: Place[];
  setView: (view: ViewId) => void;
  setDeal: (dealId: string) => void;
  setChannel: (channel: Channel) => void;
  setWeight: (key: keyof Weights, value: number) => void;
  resetWeights: () => void;
  runHour: () => number;
  queueOne: (dealId: string, channel: Channel, due: string) => void;
  markSent: (id: string) => void;
  removeItem: (id: string) => void;
  clearQueue: () => void;
  togglePosted: (key: string) => void;
  addStarterGroups: () => void;
  addGroup: (name: string, network: Place["network"]) => void;
  removeGroup: (id: string) => void;
};

export const useDesk = create<DeskState>()(
  persist(
    (set, get) => ({
      view: "post",
      dealId: DEALS[0]?.id ?? "",
      channel: "telegram",
      weights: { ...DEFAULT_WEIGHTS },
      queue: [],
      posted: [],
      groups: [],
      setView: (view) => set({ view }),
      setDeal: (dealId) => set({ dealId }),
      setChannel: (channel) => set({ channel }),
      setWeight: (key, value) =>
        set({ weights: { ...get().weights, [key]: value } }),
      resetWeights: () => set({ weights: { ...DEFAULT_WEIGHTS } }),
      runHour: () => {
        const plan = planHour(scoreAll(DEALS, get().weights));
        const have = new Set(get().queue.map((item) => `${item.dealId}:${item.channel}`));
        const added: QueueItem[] = plan
          .filter((item) => !have.has(`${item.dealId}:${item.channel}`))
          .map((item) => ({
            ...item,
            id: crypto.randomUUID(),
            status: "ready",
          }));
        set({ queue: [...get().queue, ...added], view: "routes" });
        return added.length;
      },
      queueOne: (dealId, channel, due) => {
        const exists = get().queue.some(
          (item) => item.dealId === dealId && item.channel === channel && item.status === "ready",
        );
        if (exists) return;
        set({
          queue: [
            ...get().queue,
            { id: crypto.randomUUID(), dealId, channel, due, status: "ready" },
          ],
        });
      },
      markSent: (id) =>
        set({
          queue: get().queue.map((item) =>
            item.id === id ? { ...item, status: "sent" } : item,
          ),
        }),
      removeItem: (id) => set({ queue: get().queue.filter((item) => item.id !== id) }),
      clearQueue: () => set({ queue: [] }),
      togglePosted: (key) => {
        const posted = get().posted;
        set({
          posted: posted.includes(key) ? posted.filter((item) => item !== key) : [...posted, key],
        });
      },
      addStarterGroups: () => {
        const have = new Set(get().groups.map((group) => group.id));
        const extra = STARTER_GROUPS.filter((group) => !have.has(group.id));
        set({ groups: [...get().groups, ...extra] });
      },
      addGroup: (name, network) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const channel = network === "Telegram" ? "telegram" : network === "X" ? "x" : network === "Reddit" || network === "Forum" ? "reddit" : network === "Instagram" ? "instagram" : "whatsapp";
        set({
          groups: [
            ...get().groups,
            {
              id: crypto.randomUUID(),
              name: trimmed,
              network,
              channel,
              note: "Your group. Copy, open the app, paste, then mark it posted.",
              custom: true,
            },
          ],
        });
      },
      removeGroup: (id) => set({ groups: get().groups.filter((group) => group.id !== id) }),
    }),
    {
      name: "bazaro-desk-v2",
      skipHydration: true,
      partialize: (state) => ({
        dealId: state.dealId,
        channel: state.channel,
        weights: state.weights,
        queue: state.queue,
        posted: state.posted,
        groups: state.groups,
      }),
    },
  ),
);

export function channelLabel(id: Channel) {
  return CHANNELS.find((channel) => channel.id === id)?.label ?? id;
}
