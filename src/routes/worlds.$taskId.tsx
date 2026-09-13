import { createFileRoute, notFound } from "@tanstack/react-router";
import { WorldScene } from "@/components/worlds/scenes";
import { TASKS, type TaskId } from "@/lib/aperture/tasks";

export const Route = createFileRoute("/worlds/$taskId")({
  component: WorldRoute,
});

function WorldRoute() {
  const { taskId } = Route.useParams();
  const known = TASKS.some((t) => t.id === taskId);
  if (!known) throw notFound();
  return (
    <div className="min-h-dvh">
      <WorldScene taskId={taskId as TaskId} />
    </div>
  );
}
