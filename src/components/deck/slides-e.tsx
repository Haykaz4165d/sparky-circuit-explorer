import { useState, type CSSProperties, type DragEvent as ReactDragEvent } from "react";
import { BatteryCharging, Cable, Gamepad2, Hand, Lightbulb, Plus, Power, RotateCcw } from "lucide-react";
import { Kicker, SlideLayout, delay } from "./SlideLayout";
import { cn } from "@/lib/utils";

/** Bulb drawing; `level` 0..1 is its brightness relative to 12 V nominal power. */
function Bulb({ level, size = 120 }: { level: number; size?: number }) {
  const glow = Math.max(0, Math.min(1, level));
  return (
    <svg
      width={size}
      height={size * 1.35}
      viewBox="0 0 100 135"
      aria-hidden
      className={cn("bulb-svg shrink-0", glow > 0.001 && "bulb-energized")}
      style={{ "--glow": glow } as CSSProperties}
    >
      {glow > 0.001 && (
        <g className="bulb-rays stroke-led" strokeWidth="3" strokeLinecap="round" style={{ opacity: glow * 0.8 }}>
          <path d="M50 0v7M13 12l6 6M87 12l-6 6M3 45h9M88 45h9M12 78l8-6M88 78l-8-6" />
        </g>
      )}
      <circle
        cx="50"
        cy="45"
        r="44"
        className="bulb-aura fill-led transition-opacity duration-500"
        style={{ opacity: glow * 0.38 }}
      />
      <path
        d="M50 8a34 34 0 0 0-20 61c5 4 7 9 7 15h26c0-6 2-11 7-15A34 34 0 0 0 50 8z"
        className={cn("stroke-foreground/70 transition-colors duration-500", glow > 0.001 ? "fill-led" : "fill-secondary")}
        style={{ fillOpacity: 0.2 + glow * 0.8 }}
        strokeWidth="3"
      />
      <path
        d="M40 70l5-22 5 12 5-12 5 22"
        fill="none"
        className={cn("bulb-filament transition-colors duration-500", glow > 0.001 ? "stroke-primary" : "stroke-foreground/60")}
        strokeWidth="3"
      />
      <rect x="36" y="86" width="28" height="10" rx="3" className="fill-muted-foreground" />
      <rect x="38" y="98" width="24" height="10" rx="3" className="fill-muted-foreground" />
      <rect x="43" y="110" width="14" height="8" rx="3" className="fill-foreground/60" />
    </svg>
  );
}

function CompareCard({ title, rows, tone, d }: { title: string; rows: string[]; tone: "primary" | "led"; d: number }) {
  return (
    <div className="glass-card a-rise rounded-[32px] p-10" style={delay(d)}>
      <h3 className={cn("text-[44px] font-extrabold", tone === "primary" ? "text-primary" : "text-led")}>{title}</h3>
      <ul className="mt-6 space-y-4 text-[28px] leading-snug">
        {rows.map((r) => (
          <li key={r} className="flex gap-4"><span className={tone === "primary" ? "text-primary" : "text-led"}>●</span><span>{r}</span></li>
        ))}
      </ul>
    </div>
  );
}

/* Series vs parallel connections — theory */
export function CircuitsSlide() {
  return (
    <SlideLayout>
      <div className="absolute inset-x-[110px] top-[90px]">
        <Kicker><Cable className="h-6 w-6" /> Էլեկտրական շղթաներ</Kicker>
        <h2 className="slide-title a-rise mt-6" style={delay(120)}>
          Հաջորդաբար և <span className="text-gradient-energy">զուգահեռ</span> միացում
        </h2>
        <div className="mt-12 grid grid-cols-2 gap-10">
          <CompareCard d={250} tone="primary" title="Հաջորդաբար" rows={[
            "Հոսանքը նույնն է բոլոր սարքերում՝ I = I₁ = I₂",
            "Լարումը բաժանվում է՝ U = U₁ + U₂",
            "Դիմադրությունը գումարվում է՝ R = R₁ + R₂",
            "Մեկ լամպը այրվի՝ բոլորը կմարեն",
            "Օրինակ՝ տոնածառի հին գիրլյանդա",
          ]} />
          <CompareCard d={400} tone="led" title="Զուգահեռ" rows={[
            "Լարումը նույնն է բոլոր սարքերում՝ U = U₁ = U₂",
            "Հոսանքը բաժանվում է՝ I = I₁ + I₂",
            "1/R = 1/R₁ + 1/R₂",
            "Յուրաքանչյուր սարք աշխատում է առանձին",
            "Օրինակ՝ տան վարդակներն ու լամպերը",
          ]} />
        </div>
      </div>
    </SlideLayout>
  );
}

export type Mode = "series" | "parallel" | "mixed";
export const SOURCE_U = 12; // V
export const BULB_R = 6; // Ω, each bulb: 12 V → 2 A, 24 W nominal
const P_NOM = (SOURCE_U * SOURCE_U) / BULB_R;

export type BulbState = { u: number; i: number; p: number };
export type Circuit = { r: number; i: number; bulbs: BulbState[] };

const off = (n: number): Circuit => ({ r: Infinity, i: 0, bulbs: Array.from({ length: n }, () => ({ u: 0, i: 0, p: 0 })) });
const st = (i: number): BulbState => ({ u: i * BULB_R, i, p: i * i * BULB_R });

/** Ohm's law for identical bulbs; a removed bulb is an open circuit. Mixed: bulb 1 in series with the others in parallel. */
export function solveCircuit(mode: Mode, broken: boolean[], U = SOURCE_U): Circuit {
  const n = broken.length;
  if (mode === "series") {
    if (broken.some(Boolean)) return off(n);
    const r = n * BULB_R, i = U / r;
    return { r, i, bulbs: broken.map(() => st(i)) };
  }
  if (mode === "parallel") {
    const k = broken.filter((b) => !b).length;
    if (!k) return off(n);
    const i1 = U / BULB_R;
    return { r: BULB_R / k, i: i1 * k, bulbs: broken.map((b) => st(b ? 0 : i1)) };
  }
  const k = broken.slice(1).filter((b) => !b).length;
  if (broken[0] || !k) return off(n);
  const r = BULB_R + BULB_R / k, i = U / r;
  return { r, i, bulbs: broken.map((b, j) => st(j === 0 ? i : b ? 0 : i / k)) };
}

const fmt = (x: number, d = 2) => (Number.isFinite(x) ? String(+x.toFixed(d)) : "∞");

type Point = { x: number; y: number };
type LiveWire = { d: string; current: number };
type DragSource = number | "new" | null;

const SERIES_POINTS: Point[] = [{ x: 340, y: 190 }, { x: 580, y: 190 }, { x: 820, y: 190 }, { x: 1060, y: 190 }];
const PARALLEL_Y = [70, 175, 280, 385];
const MIXED_Y = [85, 210, 335];

function slotPoints(mode: Mode): Point[] {
  if (mode === "series") return SERIES_POINTS;
  if (mode === "parallel") return PARALLEL_Y.map((y) => ({ x: 720, y }));
  return [{ x: 340, y: 210 }, ...MIXED_Y.map((y) => ({ x: 820, y }))];
}

/** Wire geometry and the current carried by each segment. Empty sockets remain visible gaps in the wires. */
function circuitWires(mode: Mode, c: Circuit): LiveWire[] {
  const common = c.i;
  const branch = (i: number) => c.bulbs[i]?.i ?? 0;
  if (mode === "series") {
    return [
      { d: "M95 410V190H255", current: common },
      { d: "M425 190H495", current: common },
      { d: "M665 190H735", current: common },
      { d: "M905 190H975", current: common },
      { d: "M1145 190H1180V410H95", current: common },
    ];
  }
  if (mode === "parallel") {
    return [
      { d: "M95 410V35H280V70", current: common },
      { d: "M280 70V385", current: common },
      ...PARALLEL_Y.flatMap((y, i): LiveWire[] => [
        { d: `M280 ${y}H590`, current: branch(i) },
        { d: `M850 ${y}H1040`, current: branch(i) },
      ]),
      { d: "M1040 70V385", current: common },
      { d: "M1040 70H1180V410H95", current: common },
    ];
  }
  return [
    { d: "M95 410V210H255", current: common },
    { d: "M425 210H540", current: common },
    { d: "M540 85V335", current: common },
    ...MIXED_Y.flatMap((y, j): LiveWire[] => [
      { d: `M540 ${y}H690`, current: branch(j + 1) },
      { d: `M950 ${y}H1080`, current: branch(j + 1) },
    ]),
    { d: "M1080 85V335", current: common },
    { d: "M1080 85H1180V410H95", current: common },
  ];
}

function SourceBadge({ voltage, power }: { voltage: number; power: boolean }) {
  return (
    <div className={cn("absolute bottom-[18px] left-[32px] flex w-[130px] flex-col items-center rounded-[22px] border px-3 py-2", power ? "border-primary/50 bg-primary/10" : "border-border bg-secondary/30")}>
      <BatteryCharging className={cn("h-9 w-9", power ? "text-primary" : "text-muted-foreground")} />
      <div className="slide-num text-[24px] font-bold">{voltage} Վ</div>
      <div className="text-[16px] text-muted-foreground">սկզբնաղբյուր</div>
    </div>
  );
}

function BulbSlot({
  idx,
  point,
  compact,
  installed,
  state,
  dragging,
  onToggle,
  onDragStart,
  onDragEnd,
  onDrop,
}: {
  idx: number;
  point: Point;
  compact: boolean;
  installed: boolean;
  state: BulbState;
  dragging: DragSource;
  onToggle: () => void;
  onDragStart: (e: ReactDragEvent<HTMLButtonElement>) => void;
  onDragEnd: () => void;
  onDrop: (e: ReactDragEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div className="absolute" style={{ left: point.x, top: point.y, transform: "translate(-50%, -50%)" }}>
      <button
        aria-label={installed ? `Լամպ ${idx + 1}․ հանել շղթայից` : `Դատարկ եղնիկ ${idx + 1}․ լամպ տեղադրել`}
        aria-pressed={installed}
        draggable={installed}
        onClick={onToggle}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={(e) => { if (!installed) e.preventDefault(); }}
        onDrop={onDrop}
        className={cn(
          "bulb-slot relative flex items-center justify-center rounded-[24px] border outline-none transition-colors focus-visible:ring-4 focus-visible:ring-ring",
          compact ? "h-[90px] w-[260px] flex-row gap-3 px-3" : "h-[180px] w-[170px] flex-col px-2",
          installed ? "bulb-placed cursor-grab border-led/30 bg-led/5" : "socket-empty cursor-pointer border-dashed border-primary/45 bg-secondary/25",
          !installed && dragging !== null && "socket-target",
        )}
      >
        {installed ? (
          <>
            <Bulb level={Math.min(1, state.p / P_NOM)} size={compact ? 48 : 60} />
            <div className={cn("slide-num whitespace-nowrap", compact ? "text-left text-[15px] leading-[1.12]" : "mt-[-4px] text-center text-[16px] leading-[1.15]")}>
              <div className="font-bold text-led">L{idx + 1}</div>
              <div>U = {fmt(state.u)} Վ</div>
              <div>I = {fmt(state.i)} Ա</div>
              <div className="text-primary">P = {fmt(state.p, 1)} Վտ</div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center text-primary">
            <Plus className={compact ? "h-8 w-8" : "h-11 w-11"} />
            <span className="slide-num mt-1 text-[17px] font-bold">L{idx + 1}</span>
            {!compact && <span className="mt-1 text-[16px] text-muted-foreground">տեղադրիր լամպը</span>}
          </div>
        )}
      </button>
    </div>
  );
}

function PowerSwitch({ power, onToggle }: { power: boolean; onToggle: () => void }) {
  return (
    <button role="switch" aria-checked={power} onClick={onToggle} className="flex w-full items-center justify-between rounded-[18px] border border-border bg-secondary/30 px-4 py-3 text-left">
      <span className="flex items-center gap-3 text-[21px] font-bold"><Power className={cn("h-6 w-6", power ? "text-primary" : "text-muted-foreground")} /> Անջատիչ</span>
      <span className={cn("relative h-[30px] w-[58px] rounded-full border transition-colors", power ? "border-primary bg-primary" : "border-border bg-muted")}>
        <span className={cn("absolute top-[3px] h-[22px] w-[22px] rounded-full bg-foreground transition-transform", power ? "translate-x-[29px]" : "translate-x-[3px]")} />
      </span>
    </button>
  );
}

/* Interactive circuit lab: drag real bulbs into sockets and observe Ohm's law. */
export function BulbGameSlide() {
  const [mode, setMode] = useState<Mode>("series");
  const [installed, setInstalled] = useState<boolean[]>([true, true, true, false]);
  const [power, setPower] = useState(true);
  const [sourceU, setSourceU] = useState(SOURCE_U);
  const [dragging, setDragging] = useState<DragSource>(null);
  const c = solveCircuit(mode, installed.map((v) => !v), power ? sourceU : 0);
  const points = slotPoints(mode);
  const wires = circuitWires(mode, c);
  const totalP = c.bulbs.reduce((a, b) => a + b.p, 0);
  const firstEmpty = installed.findIndex((v) => !v);

  const beginDrag = (e: ReactDragEvent<HTMLElement>, source: Exclude<DragSource, null>) => {
    e.dataTransfer.setData("text/plain", String(source));
    e.dataTransfer.effectAllowed = "move";
    setDragging(source);
  };
  const place = (target: number, source: Exclude<DragSource, null> = "new") => {
    setInstalled((prev) => {
      const next = [...prev];
      if (typeof source === "number") next[source] = false;
      next[target] = true;
      return next;
    });
    setDragging(null);
  };
  const dropOnSlot = (e: ReactDragEvent<HTMLElement>, target: number) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("text/plain");
    if (raw === "new") place(target);
    else if (raw !== "") place(target, Number(raw));
  };
  const dropOnTray = (e: ReactDragEvent<HTMLElement>) => {
    e.preventDefault();
    const raw = Number(e.dataTransfer.getData("text/plain"));
    if (Number.isInteger(raw) && raw >= 0) setInstalled((prev) => prev.map((v, i) => i === raw ? false : v));
    setDragging(null);
  };
  const reset = () => {
    setInstalled([true, true, true, false]);
    setPower(true);
    setSourceU(SOURCE_U);
  };
  const btn = (active: boolean) =>
    cn("rounded-full border px-6 py-2 text-[23px] font-bold transition-colors",
      active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary/40 text-foreground hover:bg-secondary");
  const status = !power
    ? "Անջատիչը բաց է՝ հոսանք չկա, լամպերը մացած են։"
    : c.i === 0
      ? "Շղթան բաց է՝ լցրու անհրաժեշտ եղնիկները, որ հոսանքը փակվի։"
      : `Փակ շղթա՝ I = U / R = ${sourceU} / ${fmt(c.r)} = ${fmt(c.i)} Ա։`;

  return (
    <SlideLayout>
      <div className="absolute inset-x-[100px] top-[45px]">
        <div className="flex items-end justify-between">
          <div>
            <Kicker tone="led"><Gamepad2 className="h-6 w-6" /> Փորձարարական լաբորատորիա</Kicker>
            <h2 className="slide-title a-rise mt-4 text-[68px]" style={delay(120)}>Հավաքիր <span className="text-gradient-energy">իրական շղթա</span></h2>
          </div>
          <div className="glass-card a-rise mb-2 rounded-full px-6 py-3 text-[22px] text-muted-foreground" style={delay(220)}>
            Յուրաքանչյուր լամպ՝ <span className="slide-num font-bold text-led">6 Օմ</span>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button className={btn(mode === "series")} onClick={() => setMode("series")}>Հաջորդաբար</button>
          <button className={btn(mode === "parallel")} onClick={() => setMode("parallel")}>Զուգահեռ</button>
          <button className={btn(mode === "mixed")} onClick={() => setMode("mixed")}>Խառը</button>
          <button className={cn(btn(false), "ml-2 flex items-center gap-2")} onClick={reset}><RotateCcw className="h-6 w-6" /> Սկսել նորից</button>
          <span className="ml-auto flex items-center gap-2 text-[21px] text-muted-foreground"><Hand className="h-6 w-6 text-primary" /> Քաշիր · տեղադրիր · դիտիր</span>
        </div>

        <div className="mt-5 grid grid-cols-[1230px_1fr] gap-[30px]">
          <div className="glass-card circuit-board relative h-[460px] w-[1230px] overflow-hidden rounded-[32px]">
            <div className="circuit-grid absolute inset-0" aria-hidden />
            <div className="absolute left-6 top-5 rounded-full border border-border bg-background/60 px-4 py-2 text-[19px] text-muted-foreground">
              {mode === "series" ? "Մեկ ուղի՝ նույն հոսանքը" : mode === "parallel" ? "Անկախ ճյուղեր՝ նույն լարումը" : "L1 հաջորդաբար, մնացածը՝ զուգահեռ"}
            </div>
            <svg className="absolute inset-0" width="1230" height="460" viewBox="0 0 1230 460" aria-hidden>
              {wires.map((w, i) => <path key={`base-${mode}-${i}`} d={w.d} fill="none" className="stroke-secondary" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />)}
              {wires.filter((w) => w.current > 0.0001).map((w, i) => {
                const duration = Math.max(0.45, 1.8 - w.current * 0.18);
                return (
                  <g key={`live-${mode}-${i}-${w.d}`}>
                    <path d={w.d} fill="none" className="current-flow wire-energized stroke-primary" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" style={{ animationDuration: `${duration}s` }} />
                    <circle r="7" className="charge-dot fill-led">
                      <animateMotion dur={`${duration * 2}s`} repeatCount="indefinite" path={w.d} />
                    </circle>
                  </g>
                );
              })}
            </svg>
            <SourceBadge voltage={sourceU} power={power} />
            {points.map((point, i) => (
              <BulbSlot
                key={i}
                idx={i}
                point={point}
                compact={mode === "parallel" || (mode === "mixed" && i > 0)}
                installed={!!installed[i]}
                state={c.bulbs[i]!}
                dragging={dragging}
                onToggle={() => setInstalled((prev) => prev.map((v, j) => j === i ? !v : v))}
                onDragStart={(e) => beginDrag(e, i)}
                onDragEnd={() => setDragging(null)}
                onDrop={(e) => dropOnSlot(e, i)}
              />
            ))}
          </div>

          <div className="flex h-[460px] flex-col gap-4">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={dropOnTray}
              className={cn("glass-card flex h-[140px] shrink-0 items-center gap-4 rounded-[28px] border-dashed p-4", dragging !== null && "border-primary/60")}
            >
              <button
                aria-label="Նոր լամպ տեղադրել առաջին դատարկ եղնիկում"
                disabled={firstEmpty < 0}
                draggable={firstEmpty >= 0}
                onDragStart={(e) => beginDrag(e, "new")}
                onDragEnd={() => setDragging(null)}
                onClick={() => { if (firstEmpty >= 0) place(firstEmpty); }}
                className="drag-source flex cursor-grab flex-col items-center rounded-[20px] border border-led/30 bg-led/5 px-4 py-1 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <Bulb level={0.7} size={46} />
                <span className="mt-[-5px] text-[17px] font-bold text-led">Քաշիր</span>
              </button>
              <div>
                <div className="text-[21px] font-bold">Լամպերի պահեստ</div>
                <p className="mt-1 text-[16px] leading-snug text-muted-foreground">Քաշիր դատարկ եղնիկը։ Հանելու համար վերադարձրու պահեստ կամ սեղմիր լամպին։</p>
              </div>
            </div>

            <div className="glass-card h-[150px] shrink-0 rounded-[28px] p-4">
              <div className="flex items-center justify-between text-[20px]">
                <span className="font-bold">Սնուցման լարում</span>
                <span className="slide-num font-bold text-primary">{sourceU} Վ</span>
              </div>
              <input aria-label="Սնուցման լարում" type="range" min="3" max="12" step="3" value={sourceU} onChange={(e) => setSourceU(Number(e.target.value))} className="mt-2 w-full accent-primary" />
              <div className="flex justify-between text-[14px] text-muted-foreground"><span>3 Վ</span><span>6 Վ</span><span>9 Վ</span><span>12 Վ</span></div>
              <div className="mt-2"><PowerSwitch power={power} onToggle={() => setPower((v) => !v)} /></div>
            </div>

            <div className="glass-card flex h-[138px] shrink-0 flex-col justify-center rounded-[28px] p-4">
              <div className="flex items-center gap-2 text-[18px] font-bold text-led"><Lightbulb className="h-5 w-5" /> Օմի օրենք</div>
              <div className="slide-num mt-1 text-[22px] font-bold">I = U / R · P = UI</div>
              <p className="mt-1 text-[16px] leading-snug text-muted-foreground">{status}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-5 text-[22px]">
          {[["R ընդհանուր", `${fmt(c.r)} Օմ`], ["I ընդհանուր", `${fmt(c.i)} Ա`], ["P ընդհանուր", `${fmt(totalP, 1)} Վտ`], ["Տեղադրված", `${installed.filter(Boolean).length} / 4 լամպ`]].map(([k, v]) => (
            <div key={k} className="glass-card flex items-center justify-between rounded-[20px] px-6 py-3">
              <div className="text-muted-foreground">{k}</div>
              <div className="slide-num font-bold text-primary">{v}</div>
            </div>
          ))}
        </div>
      </div>
    </SlideLayout>
  );
}
