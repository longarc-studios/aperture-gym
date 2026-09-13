import { useMemo, useState, type ReactNode } from "react";
import { useAperture } from "@/lib/aperture/store";
import type { TaskId } from "@/lib/aperture/tasks";

export function WorldScene({ taskId }: { taskId: TaskId }) {
  switch (taskId) {
    case "civic-library":
      return <CivicLibrary />;
    case "climate-observatory":
      return <ClimateObservatory />;
    case "citation-desk":
      return <CitationDesk />;
    case "recipe-archive":
      return <RecipeArchive />;
    case "literacy-tutor":
      return <LiteracyTutor />;
    case "permit-desk":
      return <PermitDesk />;
    case "county-archive":
      return <CountyArchive />;
    case "reading-room":
      return <ReadingRoom />;
  }
}

function Shell({
  kicker,
  title,
  children,
  tone,
  flags,
  phase,
}: {
  kicker: string;
  title: string;
  children: ReactNode;
  tone: "paper" | "night" | "sage" | "linen" | "study" | "permit" | "stacks";
  flags?: string;
  phase?: string;
}) {
  const tones: Record<typeof tone, string> = {
    paper: "bg-[#f4efe6] text-[#2a2620]",
    night: "bg-[#10161c] text-[#dce4ea]",
    sage: "bg-[#eef3ec] text-[#243027]",
    linen: "bg-[#f3eee7] text-[#2c241c]",
    study: "bg-[#f7f1e6] text-[#2b241c]",
    permit: "bg-[#eef0ea] text-[#1f2a22]",
    stacks: "bg-[#16120f] text-[#ece4d6]",
  };
  return (
    <div
      className={`min-h-full ${tones[tone]}`}
      data-aperture-flags={flags ?? ""}
      data-aperture-phase={phase ?? ""}
    >
      <header className="border-b border-black/10 px-5 py-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] opacity-60">{kicker}</p>
        <h1 className="mt-1 font-serif text-2xl tracking-tight">{title}</h1>
      </header>
      <main className="px-5 py-6">{children}</main>
    </div>
  );
}

const BOOKS = [
  { title: "Leaves of Grass", author: "Walt Whitman", call: "PS3201 1855", tags: "poetry" },
  { title: "Pride and Prejudice", author: "Jane Austen", call: "PR4034 .P7", tags: "novel" },
  { title: "The Odyssey", author: "Homer", call: "PA4025 .A5", tags: "epic" },
  {
    title: "Silent Spring",
    author: "Rachel Carson",
    call: "QH545.P4 C38",
    tags: "ecology science",
    blurb:
      "A founding text of the modern environmental movement. Public-library circulating copy, 1962 edition facsimile.",
  },
  { title: "Walden", author: "Henry David Thoreau", call: "PS3048 .A1", tags: "essay" },
];

function CivicLibrary() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return BOOKS;
    return BOOKS.filter((b) => `${b.title} ${b.author} ${b.tags}`.toLowerCase().includes(q));
  }, [query]);
  const selected = BOOKS.find((b) => b.title === open);
  const flags = [
    query.toLowerCase().includes("silent") && "searched",
    selected?.title === "Silent Spring" && "opened",
  ]
    .filter(Boolean)
    .join(",");

  return (
    <Shell kicker="Municipal collection" title="Civic Library Catalog" tone="paper" flags={flags} phase={selected ? "record" : "catalog"}>
      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <label className="sr-only" htmlFor="catalog-q">
          Search titles
        </label>
        <input
          id="catalog-q"
          role="searchbox"
          aria-label="Search titles"
          placeholder="Search titles, authors, subjects"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          suppressHydrationWarning
          className="h-11 flex-1 rounded-md border border-black/15 bg-white px-3 text-sm"
        />
        <button type="submit" className="h-11 rounded-md bg-[#2a2620] px-4 text-sm text-[#f4efe6]">
          Search
        </button>
      </form>
      <ul className="mt-6 divide-y divide-black/10">
        {hits.map((book) => (
          <li key={book.title}>
            <button
              type="button"
              className="flex w-full items-baseline justify-between gap-4 py-3 text-left"
              onClick={() => setOpen(book.title)}
            >
              <span>
                <span className="block font-medium">{book.title}</span>
                <span className="text-sm opacity-70">{book.author}</span>
              </span>
              <span className="font-mono text-xs opacity-70">{book.call}</span>
            </button>
          </li>
        ))}
      </ul>
      {selected ? (
        <article className="mt-6 rounded-lg border border-black/10 bg-white p-4" aria-label="Catalog record">
          <h2 className="font-serif text-xl">{selected.title}</h2>
          <p className="mt-1 text-sm opacity-70">{selected.author}</p>
          <p className="mt-4 font-mono text-sm">
            Call number: <strong>{selected.call}</strong>
          </p>
          {selected.blurb ? <p className="mt-3 text-sm leading-relaxed">{selected.blurb}</p> : null}
        </article>
      ) : null}
    </Shell>
  );
}

const ANOMALIES = [
  { year: 2015, value: 0.9 },
  { year: 2016, value: 1.01 },
  { year: 2017, value: 0.92 },
  { year: 2018, value: 0.85 },
  { year: 2019, value: 0.98 },
  { year: 2020, value: 1.02 },
  { year: 2021, value: 0.85 },
  { year: 2022, value: 0.89 },
  { year: 2023, value: 1.17 },
  { year: 2024, value: 1.29 },
  { year: 2025, value: 1.1 },
];

function ClimateObservatory() {
  const [decade, setDecade] = useState("2010s");
  const rows = ANOMALIES.filter((r) => (decade === "2010s" ? r.year < 2020 : r.year >= 2020));
  const flags = [decade === "2020s" && "decade", decade === "2020s" && "read"].filter(Boolean).join(",");
  return (
    <Shell kicker="Open climate literacy" title="Hemlock Observatory" tone="night" flags={flags} phase={decade}>
      <p className="max-w-xl text-sm leading-relaxed opacity-80">
        Global mean surface temperature anomaly relative to 1951–1980, rounded public figures in the style of NASA
        GISTEMP for classroom use. The 2010s load first; switch decade to inspect later years.
      </p>
      <label className="mt-6 block text-xs uppercase tracking-widest opacity-60" htmlFor="decade">
        Decade
      </label>
      <select
        id="decade"
        aria-label="Decade"
        className="mt-2 h-11 rounded-md border border-white/15 bg-[#182028] px-3 text-sm"
        value={decade}
        onChange={(e) => setDecade(e.target.value)}
      >
        <option>2010s</option>
        <option>2020s</option>
      </select>
      <table className="mt-6 w-full text-left text-sm">
        <caption className="sr-only">Temperature anomalies by year</caption>
        <thead className="text-xs uppercase tracking-widest opacity-60">
          <tr>
            <th className="py-2">Year</th>
            <th>Anomaly °C</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.year} className="border-t border-white/10">
              <td className="py-2 font-mono">{r.year}</td>
              <td className="font-mono">+{r.value.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Shell>
  );
}

function CitationDesk() {
  const [revealed, setRevealed] = useState(false);
  const flags = [revealed && "revealed", revealed && "read"].filter(Boolean).join(",");
  return (
    <Shell kicker="Writing center" title="Citation Desk" tone="study" flags={flags} phase={revealed ? "card" : "closed"}>
      {!revealed ? (
        <button
          type="button"
          className="rounded-md border border-black/15 bg-white px-4 py-3 text-left"
          onClick={() => setRevealed(true)}
        >
          Show paper card
        </button>
      ) : (
        <article className="rounded-lg border border-black/10 bg-white p-5">
          <p className="text-[11px] uppercase tracking-[0.16em] opacity-60">Paper card</p>
          <h2 className="mt-2 font-serif text-2xl leading-snug">Community Seed Libraries and Food Sovereignty</h2>
          <dl className="mt-4 grid gap-2 text-sm">
            <div>
              <dt className="opacity-60">Author</dt>
              <dd>Ada Okonkwo</dd>
            </div>
            <div>
              <dt className="opacity-60">Journal</dt>
              <dd>Journal of Open Agriculture</dd>
            </div>
            <div>
              <dt className="opacity-60">Volume / issue</dt>
              <dd>vol. 12, no. 3</dd>
            </div>
            <div>
              <dt className="opacity-60">Year</dt>
              <dd>2021</dd>
            </div>
            <div>
              <dt className="opacity-60">Pages</dt>
              <dd>44-61</dd>
            </div>
            <div>
              <dt className="opacity-60">DOI</dt>
              <dd>10.0000/joa.2021.12.3.44</dd>
            </div>
          </dl>
        </article>
      )}
      <p className="mt-5 max-w-xl text-sm leading-relaxed opacity-80">
        Compose an MLA 9 works-cited entry from the card. This desk does not phone home; the metadata is here for
        teaching citation craft.
      </p>
    </Shell>
  );
}

function RecipeArchive() {
  const [open, setOpen] = useState(false);
  const flags = [open && "opened", open && "read"].filter(Boolean).join(",");
  return (
    <Shell kicker="Public-domain kitchen" title="Parish Recipe Archive" tone="linen" flags={flags} phase={open ? "recipe" : "list"}>
      <button
        type="button"
        className="rounded-md border border-black/15 bg-white px-4 py-3 text-left"
        onClick={() => setOpen(true)}
      >
        <span className="block font-serif text-lg">Farm Loaf</span>
        <span className="text-sm opacity-70">Yeast bread · 1918 household circular</span>
      </button>
      {open ? (
        <article className="mt-6 rounded-lg border border-black/10 bg-white p-5">
          <h2 className="font-serif text-2xl">Farm Loaf</h2>
          <h3 className="mt-5 text-xs uppercase tracking-[0.16em] opacity-60">Ingredients</h3>
          <ul className="mt-2 list-disc pl-5 text-sm">
            <li>flour</li>
            <li>water</li>
            <li>salt</li>
            <li>yeast</li>
            <li>honey</li>
            <li>oil</li>
          </ul>
          <p className="mt-4 text-sm leading-relaxed opacity-80">
            Stir a sponge overnight. Knead until smooth, let rise, shape, and bake in a moderate oven. Shared from a
            public-domain agricultural bulletin for community kitchens.
          </p>
        </article>
      ) : null}
    </Shell>
  );
}

function LiteracyTutor() {
  const [choice, setChoice] = useState<string | null>(null);
  const [score, setScore] = useState<string | null>(null);
  const flags = [choice === "B" && "chose", score === "1/1" && "graded"].filter(Boolean).join(",");
  return (
    <Shell kicker="Adult literacy" title="Evening Tutor" tone="sage" flags={flags} phase={score ? "scored" : "quiz"}>
      <blockquote className="border-l-2 border-black/20 pl-4 font-serif text-lg leading-relaxed">
        I went to the woods because I wished to live deliberately, to front only the essential facts of life, and see
        if I could not learn what it had to teach, and not, when I came to die, discover that I had not lived.
      </blockquote>
      <p className="mt-2 text-xs opacity-60">Henry David Thoreau, Walden (public domain)</p>
      <fieldset className="mt-6">
        <legend className="text-sm font-medium">Question 2. Why did Thoreau go to the woods?</legend>
        <div className="mt-3 grid gap-2">
          {[
            { id: "A", label: "To survey timber for the railroad." },
            { id: "B", label: "To live deliberately and meet the essential facts of life." },
            { id: "C", label: "To hide from creditors in Concord." },
          ].map((opt) => (
            <label
              key={opt.id}
              className="flex cursor-pointer items-start gap-3 rounded-md border border-black/10 bg-white px-3 py-3 text-sm"
            >
              <input
                type="radio"
                name="q2"
                value={opt.id}
                checked={choice === opt.id}
                onChange={() => setChoice(opt.id)}
                aria-label={`${opt.id}. ${opt.label}`}
              />
              <span>
                <span className="font-medium">{opt.id}.</span> {opt.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <button
        type="button"
        className="mt-5 h-11 rounded-md bg-[#243027] px-4 text-sm text-[#eef3ec]"
        onClick={() => setScore(choice === "B" ? "1/1" : "0/1")}
      >
        Grade quiz
      </button>
      {score ? (
        <p className="mt-4 text-sm" role="status">
          Score {score}
        </p>
      ) : null}
    </Shell>
  );
}

type PermitPhase = "choose" | "elig" | "form" | "done" | "denied";

function PermitDesk() {
  const [phase, setPhase] = useState<PermitPhase>("choose");
  const [kind, setKind] = useState<string | null>(null);
  const [elig, setElig] = useState<Record<string, "yes" | "no" | null>>({
    resident: null,
    noncom: null,
    share: null,
  });
  const [name, setName] = useState("");
  const [intent, setIntent] = useState("");
  const [season, setSeason] = useState("");
  const allYes = elig.resident === "yes" && elig.noncom === "yes" && elig.share === "yes";
  const filled = name.trim().length > 2 && intent.trim().length > 2 && season.length > 0;
  const flags = [
    kind === "garden" && "chose",
    phase !== "choose" && phase !== "elig" && allYes && "eligible",
    filled && (phase === "form" || phase === "done") && "filled",
    phase === "done" && "issued",
  ]
    .filter(Boolean)
    .join(",");

  return (
    <Shell kicker="County clerk" title="Civic Permit Desk" tone="permit" flags={flags} phase={phase}>
      {phase === "choose" ? (
        <div className="grid gap-3">
          <p className="max-w-xl text-sm leading-relaxed opacity-80">
            Choose a permit type. Garden plots are allocated each spring to county residents who share surplus with the
            community kitchen.
          </p>
          {[
            { id: "garden", label: "Community garden plot" },
            { id: "seed", label: "Seed library event" },
            { id: "literacy", label: "Adult literacy workshop" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              className="h-11 rounded-md border border-black/15 bg-white px-4 text-left text-sm"
              onClick={() => {
                setKind(item.id);
                setPhase("elig");
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {phase === "elig" ? (
        <div className="grid gap-5">
          <p className="text-sm opacity-80">Answer every eligibility question, then continue.</p>
          <EligRow
            prompt="Resident of the county?"
            value={elig.resident}
            yesLabel="Yes — Resident of the county?"
            noLabel="No — Resident of the county?"
            onChange={(v) => setElig((e) => ({ ...e, resident: v }))}
          />
          <EligRow
            prompt="Plot for non-commercial use?"
            value={elig.noncom}
            yesLabel="Yes — Plot for non-commercial use?"
            noLabel="No — Plot for non-commercial use?"
            onChange={(v) => setElig((e) => ({ ...e, noncom: v }))}
          />
          <EligRow
            prompt="Agree to share surplus with the community kitchen?"
            value={elig.share}
            yesLabel="Yes — Agree to share surplus with the community kitchen?"
            noLabel="No — Agree to share surplus with the community kitchen?"
            onChange={(v) => setElig((e) => ({ ...e, share: v }))}
          />
          <button
            type="button"
            className="h-11 w-fit rounded-md bg-[#1f2a22] px-4 text-sm text-[#eef0ea] disabled:opacity-40"
            disabled={Object.values(elig).some((v) => v == null)}
            onClick={() => setPhase(allYes && kind === "garden" ? "form" : "denied")}
          >
            Continue
          </button>
        </div>
      ) : null}

      {phase === "form" ? (
        <form
          className="grid max-w-md gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (filled) setPhase("done");
          }}
        >
          <label className="grid gap-1.5 text-sm">
            Full name
            <input
              aria-label="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 rounded-md border border-black/15 bg-white px-3"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            Plot intent
            <input
              aria-label="Plot intent"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              className="h-11 rounded-md border border-black/15 bg-white px-3"
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            Season
            <select
              aria-label="Season"
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="h-11 rounded-md border border-black/15 bg-white px-3"
            >
              <option value="">Select season</option>
              <option>Spring 2026</option>
              <option>Fall 2026</option>
            </select>
          </label>
          <button type="submit" className="h-11 rounded-md bg-[#1f2a22] px-4 text-sm text-[#eef0ea]">
            Submit application
          </button>
        </form>
      ) : null}

      {phase === "done" ? (
        <article className="max-w-md rounded-lg border border-black/10 bg-white p-5">
          <h2 className="font-serif text-xl">Permit issued</h2>
          <p className="mt-3 text-sm">Applicant {name || "—"}</p>
          <p className="mt-1 text-sm">Season {season}</p>
          <p className="mt-4 font-mono text-sm">
            Permit ID: <strong>PRM-GARDEN-2026-441</strong>
          </p>
          <p className="mt-3 text-sm leading-relaxed opacity-80">
            Post this ID at the plot gate. Surplus goes to the community kitchen on Sundays.
          </p>
        </article>
      ) : null}

      {phase === "denied" ? (
        <p className="max-w-md text-sm leading-relaxed">
          This desk cannot issue that permit with the answers given. Start again and choose the community garden plot
          with every eligibility question answered yes.
        </p>
      ) : null}
    </Shell>
  );
}

function EligRow({
  prompt,
  value,
  yesLabel,
  noLabel,
  onChange,
}: {
  prompt: string;
  value: "yes" | "no" | null;
  yesLabel: string;
  noLabel: string;
  onChange: (v: "yes" | "no") => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{prompt}</legend>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          aria-label={yesLabel}
          aria-pressed={value === "yes"}
          className={`h-11 rounded-md px-4 text-sm ${value === "yes" ? "bg-[#1f2a22] text-[#eef0ea]" : "border border-black/15 bg-white"}`}
          onClick={() => onChange("yes")}
        >
          Yes
        </button>
        <button
          type="button"
          aria-label={noLabel}
          aria-pressed={value === "no"}
          className={`h-11 rounded-md px-4 text-sm ${value === "no" ? "bg-[#1f2a22] text-[#eef0ea]" : "border border-black/15 bg-white"}`}
          onClick={() => onChange("no")}
        >
          No
        </button>
      </div>
    </fieldset>
  );
}

const ARCHIVE = [
  { id: "journal", title: "Journal fragment, Concord", year: 1845, accession: "MSS.WAL.1845.11", who: "Thoreau" },
  { id: "survey", title: "Survey notes, Walden lot", year: 1845, accession: "MSS.WAL.1845.02", who: "Thoreau" },
  { id: "letter", title: "Letter to Emerson, March 1847", year: 1847, accession: "MSS.WAL.1847.03", who: "Thoreau" },
  { id: "walking", title: "Walking lecture notes", year: 1854, accession: "MSS.WAL.1854.07", who: "Thoreau" },
];

function CountyArchive() {
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("all");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const [tab, setTab] = useState<"transcript" | "catalog" | "provenance">("transcript");
  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ARCHIVE.filter((item) => {
      const text = `${item.title} ${item.who}`.toLowerCase();
      if (q && !text.includes(q)) return false;
      if (year !== "all" && String(item.year) !== year) return false;
      return true;
    });
  }, [query, year]);
  const perPage = 2;
  const pages = Math.max(1, Math.ceil(hits.length / perPage));
  const slice = hits.slice((page - 1) * perPage, page * perPage);
  const selected = ARCHIVE.find((i) => i.id === open);
  const letterVisible = slice.some((i) => i.id === "letter") || selected?.id === "letter";
  const flags = [
    query.toLowerCase().includes("thoreau") && "searched",
    letterVisible && "located",
    selected?.id === "letter" && "opened",
    selected?.id === "letter" && tab === "catalog" && "catalog",
  ]
    .filter(Boolean)
    .join(",");

  return (
    <Shell kicker="County stacks" title="Hemlock County Archive" tone="stacks" flags={flags} phase={selected ? tab : "index"}>
      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setOpen(null);
        }}
      >
        <input
          role="searchbox"
          aria-label="Search stacks"
          placeholder="Search collections"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          className="h-11 flex-1 rounded-md border border-white/15 bg-[#221c18] px-3 text-sm"
        />
        <button type="submit" className="h-11 rounded-md bg-[#ece4d6] px-4 text-sm text-[#16120f]">
          Search
        </button>
      </form>
      <label className="mt-4 block text-xs uppercase tracking-widest opacity-60" htmlFor="year">
        Year
      </label>
      <select
        id="year"
        aria-label="Year"
        className="mt-2 h-11 rounded-md border border-white/15 bg-[#221c18] px-3 text-sm"
        value={year}
        onChange={(e) => {
          setYear(e.target.value);
          setPage(1);
        }}
      >
        <option value="all">All years</option>
        <option value="1845">1845</option>
        <option value="1847">1847</option>
        <option value="1854">1854</option>
      </select>
      <ul className="mt-6 divide-y divide-white/10">
        {slice.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="flex w-full items-baseline justify-between gap-4 py-3 text-left"
              onClick={() => {
                setOpen(item.id);
                setTab("transcript");
              }}
            >
              <span className="font-medium">{item.title}</span>
              <span className="font-mono text-xs opacity-70">{item.year}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="h-11 rounded-md border border-white/15 px-3 text-sm disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Previous page
        </button>
        <button
          type="button"
          className="h-11 rounded-md border border-white/15 px-3 text-sm disabled:opacity-40"
          disabled={page >= pages}
          onClick={() => setPage((p) => Math.min(pages, p + 1))}
        >
          Next page
        </button>
      </div>
      {selected ? (
        <article className="mt-6 rounded-lg border border-white/10 bg-[#221c18] p-4">
          <h2 className="font-serif text-xl">{selected.title}</h2>
          <div role="tablist" aria-label="Record sections" className="mt-4 flex gap-2">
            {(
              [
                ["transcript", "Transcript"],
                ["catalog", "Cataloging"],
                ["provenance", "Provenance"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className={`h-11 rounded-md px-3 text-sm ${tab === id ? "bg-[#ece4d6] text-[#16120f]" : "border border-white/15"}`}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-4 text-sm leading-relaxed">
            {tab === "transcript" ? (
              <p>
                A working copy of the March letter, public-domain. The body lives in the reading room; this card is the
                catalog stub.
              </p>
            ) : null}
            {tab === "catalog" ? (
              <p className="font-mono">
                Accession number: <strong>{selected.accession}</strong>
              </p>
            ) : null}
            {tab === "provenance" ? (
              <p>Gift of the Concord reading circle, 1922. Classroom facsimile. Not for sale.</p>
            ) : null}
          </div>
        </article>
      ) : null}
    </Shell>
  );
}

function ReadingRoom() {
  const docs = useAperture((s) => s.documents);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = docs.find((d) => d.id === openId) ?? null;
  const flags = [docs.length ? "listed" : "", open ? "opened" : ""].filter(Boolean).join(",");

  return (
    <Shell kicker="Your corpus" title="Reading Room" tone="study" flags={flags}>
      <main className="mx-auto max-w-2xl px-5 py-8">
        <h1 className="font-serif text-3xl">Reading room</h1>
        <p className="mt-2 text-sm opacity-70">
          Documents you ingested on the Data page. Open one, then extract a fact.
        </p>
        {docs.length === 0 ? (
          <p className="mt-8 rounded-md border border-black/10 p-4 text-sm">
            The desk is empty. Add markdown, text, JSON, or JSONL on the Data page, then return here.
          </p>
        ) : (
          <ul className="mt-6 space-y-2">
            {docs.map((doc) => (
              <li key={doc.id}>
                <button
                  type="button"
                  className="w-full rounded-md border border-black/10 bg-white/50 px-3 py-3 text-left text-sm"
                  onClick={() => setOpenId(doc.id)}
                >
                  Open {doc.name}
                  <span className="ml-2 opacity-60">{doc.kind}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {open ? (
          <article className="mt-8 rounded-md border border-black/10 bg-white/70 p-4" aria-label="Open document">
            <h2 className="font-serif text-xl">{open.name}</h2>
            <dl className="mt-3 grid gap-1 text-sm">
              <div className="flex gap-2">
                <dt className="opacity-60">Kind</dt>
                <dd>{open.kind}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="opacity-60">Bytes</dt>
                <dd>{open.bytes}</dd>
              </div>
            </dl>
            <pre className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap font-serif text-sm leading-relaxed">
              {open.body.slice(0, 12000)}
            </pre>
          </article>
        ) : null}
      </main>
    </Shell>
  );
}
