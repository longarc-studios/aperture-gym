export type TaskId =
  | "civic-library"
  | "climate-observatory"
  | "citation-desk"
  | "recipe-archive"
  | "literacy-tutor"
  | "permit-desk"
  | "county-archive"
  | "reading-room";

export type ProgressSpec = {
  id: string;
  label: string;
};

export type TaskDefinition = {
  id: TaskId;
  title: string;
  realm: string;
  summary: string;
  instruction: string;
  successHint: string;
  maxSteps: number;
  expected: {
    includes: string[];
    excludes?: string[];
  };
  progress: ProgressSpec[];
  sweep?: boolean;
};

export const TASKS: TaskDefinition[] = [
  {
    id: "civic-library",
    title: "Civic Library",
    realm: "Public knowledge",
    summary: "Search an open catalog and retrieve a call number.",
    instruction:
      "You are helping a patron at a public library. Open the catalog, search for Rachel Carson's Silent Spring, open the record, and submit the Library of Congress call number with done.",
    successHint: "The call number is QH545.P4 C38",
    maxSteps: 8,
    expected: { includes: ["QH545"] },
    progress: [
      { id: "searched", label: "Searched catalog" },
      { id: "opened", label: "Opened record" },
      { id: "answered", label: "Submitted call number" },
    ],
  },
  {
    id: "climate-observatory",
    title: "Climate Observatory",
    realm: "Earth science",
    summary: "Switch decade, read the anomaly table, report the warmest year.",
    instruction:
      "You are assisting a climate literacy workshop. The observatory table defaults to the 2010s. Switch it to the 2020s, inspect global temperature anomalies (NASA GISTEMP-style public figures, rounded), and submit the warmest year in that decade with done.",
    successHint: "Warmest year in the 2020s table is 2024",
    maxSteps: 8,
    expected: { includes: ["2024"] },
    progress: [
      { id: "decade", label: "Selected 2020s" },
      { id: "read", label: "Read anomaly table" },
      { id: "answered", label: "Submitted warmest year" },
    ],
  },
  {
    id: "citation-desk",
    title: "Citation Desk",
    realm: "Scholarship",
    summary: "Reveal a paper card and build an MLA citation.",
    instruction:
      "You are staffing a university writing center. Reveal the paper card on the desk and submit a correct MLA 9 works-cited entry for it using done. Include author, title, journal, volume, year, and pages.",
    successHint:
      'Okonkwo, Ada. "Community Seed Libraries and Food Sovereignty." Journal of Open Agriculture, vol. 12, no. 3, 2021, pp. 44-61.',
    maxSteps: 6,
    expected: {
      includes: ["Okonkwo", "Seed Libraries", "Open Agriculture", "2021"],
    },
    progress: [
      { id: "revealed", label: "Revealed paper card" },
      { id: "read", label: "Read metadata" },
      { id: "answered", label: "Submitted MLA entry" },
    ],
  },
  {
    id: "recipe-archive",
    title: "Recipe Archive",
    realm: "Public domain",
    summary: "Extract ingredients from a public-domain bread recipe.",
    instruction:
      "You are digitizing a public-domain cookbook for a community kitchen. Open the Farm Loaf recipe and submit a comma-separated list of the six ingredients (no quantities) with done.",
    successHint: "flour, water, salt, yeast, honey, oil",
    maxSteps: 6,
    expected: {
      includes: ["flour", "water", "salt", "yeast", "honey", "oil"],
    },
    progress: [
      { id: "opened", label: "Opened Farm Loaf" },
      { id: "read", label: "Read ingredients" },
      { id: "answered", label: "Submitted ingredient list" },
    ],
  },
  {
    id: "literacy-tutor",
    title: "Literacy Tutor",
    realm: "Education",
    summary: "Answer a reading-comprehension item on a public-domain passage.",
    instruction:
      "You are tutoring an adult literacy student. Read the Walden excerpt, answer question 2 on the quiz (the one about why Thoreau went to the woods), then submit both the chosen option letter and the quiz score shown on the page using done. Example: 'B, 1/1'.",
    successHint: "B (to live deliberately), score 1/1",
    maxSteps: 8,
    expected: { includes: ["B", "1/1"] },
    progress: [
      { id: "chose", label: "Chose option B" },
      { id: "graded", label: "Graded quiz" },
      { id: "answered", label: "Submitted letter and score" },
    ],
  },
  {
    id: "permit-desk",
    title: "Permit Desk",
    realm: "Civic process",
    summary: "Walk a multi-step garden-plot permit and copy the issued ID.",
    instruction:
      "You are helping a neighbor apply for a community garden plot. Choose the community garden permit, answer yes to every eligibility question, fill the application (name Ada Okonkwo, intent 'shared greens', season Spring 2026), submit, and return the issued permit ID with done.",
    successHint: "Permit ID is PRM-GARDEN-2026-441",
    maxSteps: 16,
    expected: { includes: ["PRM-GARDEN-2026-441"] },
    progress: [
      { id: "chose", label: "Chose garden permit" },
      { id: "eligible", label: "Completed eligibility" },
      { id: "filled", label: "Filled application" },
      { id: "issued", label: "Reached confirmation" },
      { id: "answered", label: "Submitted permit ID" },
    ],
  },
  {
    id: "county-archive",
    title: "County Archive",
    realm: "Primary sources",
    summary: "Search, filter or page, open a letter, read the Cataloging tab.",
    instruction:
      "You are pulling a primary source for a literacy seminar. Search the stacks for Thoreau, find the March 1847 letter to Emerson (filter by 1847 or turn the page), open it, switch to the Cataloging tab, and submit the accession number with done.",
    successHint: "Accession number is MSS.WAL.1847.03",
    maxSteps: 12,
    expected: { includes: ["MSS.WAL.1847.03"] },
    progress: [
      { id: "searched", label: "Searched stacks" },
      { id: "located", label: "Located the letter" },
      { id: "opened", label: "Opened the record" },
      { id: "catalog", label: "Opened Cataloging tab" },
      { id: "answered", label: "Submitted accession" },
    ],
  },
  {
    id: "reading-room",
    title: "Reading Room",
    realm: "Your corpus",
    summary: "Open a document you ingested and extract something from it.",
    instruction:
      "This world is your data. Open a document from the desk, read it, extract a concrete fact or short summary, and submit it with done. If the desk is empty, ingest files on the Data page first.",
    successHint: "Any faithful extract from an opened document.",
    maxSteps: 8,
    expected: { includes: [] },
    sweep: false,
    progress: [
      { id: "listed", label: "Saw the desk" },
      { id: "opened", label: "Opened a document" },
      { id: "answered", label: "Submitted an extract" },
    ],
  },
];

export function getTask(id: string): TaskDefinition {
  const task = TASKS.find((t) => t.id === id);
  if (!task) throw new Error(`Unknown task: ${id}`);
  return task;
}

export function worldPath(id: string) {
  return `/worlds/${id}`;
}

export function gradeAnswer(
  task: TaskDefinition,
  answer: string,
): {
  ok: boolean;
  missing: string[];
} {
  const hay = answer.toLowerCase();
  const missing = task.expected.includes.filter(
    (needle) => !hay.includes(needle.toLowerCase()),
  );
  const banned = (task.expected.excludes ?? []).filter((n) =>
    hay.includes(n.toLowerCase()),
  );
  return { ok: missing.length === 0 && banned.length === 0, missing };
}
