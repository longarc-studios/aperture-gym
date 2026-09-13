import { useRef, useState } from "react";
import { Download, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { exportTrainingPack } from "@/lib/aperture/corpus";
import { downloadFile } from "@/lib/aperture/export";
import { ingestFiles, ingestPasted } from "@/lib/aperture/ingest";
import { useAperture } from "@/lib/aperture/store";

export function DataDesk() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [paste, setPaste] = useState("");
  const documents = useAperture((s) => s.documents);
  const episodes = useAperture((s) => s.episodes);
  const addDocuments = useAperture((s) => s.addDocuments);
  const upsertEpisode = useAperture((s) => s.upsertEpisode);
  const removeDocument = useAperture((s) => s.removeDocument);
  const clearDocuments = useAperture((s) => s.clearDocuments);

  const absorb = (docs: ReturnType<typeof ingestFiles>) => {
    if (docs.docs.length) addDocuments(docs.docs);
    for (const ep of docs.episodes) upsertEpisode(ep);
    const n = docs.docs.length + docs.episodes.length;
    if (!n) toast.error("Nothing we could ingest. Use markdown, text, JSON, or JSONL.");
    else toast(`Ingested ${docs.docs.length} document${docs.docs.length === 1 ? "" : "s"}, ${docs.episodes.length} episode${docs.episodes.length === 1 ? "" : "s"}`);
  };

  const onFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    const files = await Promise.all(
      [...list].map(async (file) => ({ name: file.name, text: await file.text() })),
    );
    absorb(ingestFiles(files));
  };

  const pack = (kind: "sft" | "trajectories" | "markdown" | "openai-ft") => {
    if (!episodes.length && !documents.length) {
      toast.error("Run an episode or drop a document first.");
      return;
    }
    downloadFile(exportTrainingPack(episodes, documents, kind));
  };

  return (
    <div className="grid gap-4">
      <div
        className="grid min-h-40 place-items-center rounded-xl bg-card px-4 py-8 text-center shadow-[var(--shadow-border)]"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void onFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".md,.txt,.json,.jsonl,.csv,text/markdown,application/json"
          multiple
          className="sr-only"
          onChange={(e) => {
            void onFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <p className="text-sm text-muted-foreground">
          Drop markdown, JSONL transcripts, or OpenAI-style episode files. They stay in this browser.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button variant="secondary" onClick={() => inputRef.current?.click()}>
            <Upload className="size-4" />
            Choose files
          </Button>
          {typeof window !== "undefined" && window.apertureDesktop?.openFiles ? (
            <Button
              variant="outline"
              onClick={async () => {
                const files = await window.apertureDesktop?.openFiles();
                if (files?.length) absorb(ingestFiles(files));
              }}
            >
              Open from disk
            </Button>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl bg-card p-4 shadow-[var(--shadow-border)]">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Paste</p>
        <Textarea
          className="mt-3 min-h-32"
          placeholder='{"messages":[...]} or a markdown note'
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
        />
        <Button
          className="mt-3"
          variant="secondary"
          disabled={!paste.trim()}
          onClick={() => {
            absorb(ingestPasted(paste));
            setPaste("");
          }}
        >
          Ingest paste
        </Button>
      </div>

      <div className="rounded-xl bg-card p-4 shadow-[var(--shadow-border)]">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Training packs</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Built from library episodes plus ingested documents. Yours to fine-tune, run DPO, or keep as notes.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => pack("sft")}>
            <Download className="size-3.5" />
            SFT JSONL
          </Button>
          <Button size="sm" variant="secondary" onClick={() => pack("trajectories")}>
            <Download className="size-3.5" />
            Trajectories
          </Button>
          <Button size="sm" variant="outline" onClick={() => pack("markdown")}>
            <Download className="size-3.5" />
            Markdown corpus
          </Button>
        </div>
        <p className="mt-3 font-mono text-xs text-muted-foreground">
          {episodes.length} episode{episodes.length === 1 ? "" : "s"} · {documents.length} document{documents.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="rounded-xl bg-card p-4 shadow-[var(--shadow-border)]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Documents</p>
          {documents.length ? (
            <Button size="sm" variant="ghost" onClick={clearDocuments}>
              <Trash2 className="size-3.5" />
              Clear
            </Button>
          ) : null}
        </div>
        <ul className="mt-3 space-y-2">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-3 rounded-md bg-secondary px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm">{doc.name}</p>
                <p className="font-mono text-[11px] text-muted-foreground">{doc.bytes} chars</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="muted">{doc.kind}</Badge>
                <Button size="sm" variant="ghost" onClick={() => removeDocument(doc.id)}>
                  Remove
                </Button>
              </div>
            </li>
          ))}
          {!documents.length ? (
            <li className="text-sm text-muted-foreground">No documents yet. Played episodes still pack from the library.</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
