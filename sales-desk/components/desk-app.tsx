import { useEffect } from "react";
import {
  BookOpen,
  LayoutDashboard,
  PenLine,
  Radar,
  Route,
  Send,
} from "lucide-react";
import { useDesk } from "@/lib/sales/store";
import type { ViewId } from "@/lib/sales/types";
import { DeskView, MethodView, RadarView, RoutesView, StudioView } from "@/components/sales/views";
import { PostView } from "@/components/sales/post-view";

const NAV: { id: ViewId; label: string; icon: typeof Radar }[] = [
  { id: "post", label: "Post", icon: Send },
  { id: "radar", label: "Radar", icon: Radar },
  { id: "studio", label: "Studio", icon: PenLine },
  { id: "routes", label: "Routes", icon: Route },
  { id: "desk", label: "Desk", icon: LayoutDashboard },
  { id: "method", label: "Method", icon: BookOpen },
];

export function DeskApp() {
  const view = useDesk((state) => state.view);
  const setView = useDesk((state) => state.setView);

  useEffect(() => {
    void useDesk.persist.rehydrate();
  }, []);

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <div className="h-1 bg-primary" />
      <div className="mx-auto flex max-w-6xl flex-col md:flex-row">
        <aside className="border-b border-line px-4 py-4 md:sticky md:top-0 md:flex md:h-dvh md:w-56 md:shrink-0 md:flex-col md:border-r md:border-b-0 md:px-4 md:py-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary font-display text-lg text-primary-fg">
              Bb
            </span>
            <span>
              <span className="block font-display text-xl leading-none">Bazaar Desk</span>
              <span className="mt-1 block text-sm text-muted">Sales engine</span>
            </span>
          </div>
          <nav className="mt-6 hidden flex-col gap-1 md:flex">
            {NAV.map((item) => (
              <NavButton
                key={item.id}
                item={item}
                active={view === item.id}
                onClick={() => setView(item.id)}
              />
            ))}
          </nav>
          <p className="mt-auto hidden pt-6 text-sm text-muted md:block">
            Sample radar, shaped like a DealDash hour. Not a live Amazon price.
          </p>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 pb-28 md:px-8 md:py-8 md:pb-10">
          {view === "post" && <PostView />}
          {view === "desk" && <DeskView />}
          {view === "radar" && <RadarView />}
          {view === "studio" && <StudioView />}
          {view === "routes" && <RoutesView />}
          {view === "method" && <MethodView />}
        </main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-bg md:hidden">
        <ul className="grid grid-cols-5">
          {NAV.filter((item) => item.id !== "method").map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setView(item.id)}
                  className={`flex min-h-16 w-full flex-col items-center justify-center gap-1 text-xs ${
                    active ? "text-primary" : "text-muted"
                  }`}
                >
                  <Icon size={18} aria-hidden />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: (typeof NAV)[number];
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-left text-sm ${
        active ? "bg-raised text-fg" : "text-muted hover:bg-surface hover:text-fg"
      }`}
    >
      <Icon size={18} aria-hidden />
      {item.label}
    </button>
  );
}
