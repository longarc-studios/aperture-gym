import type { Ref } from "react";
import { WorldScene } from "@/components/worlds/scenes";
import type { TaskId } from "@/lib/aperture/tasks";
import { cn } from "@/lib/utils";

export function WorldStage({
  taskId,
  stageRef,
  className,
}: {
  taskId: TaskId;
  stageRef: Ref<HTMLDivElement>;
  className?: string;
}) {
  return (
    <div
      ref={stageRef}
      data-aperture-stage=""
      className={cn("h-[420px] w-full overflow-auto bg-secondary md:h-[520px]", className)}
    >
      <WorldScene taskId={taskId} />
    </div>
  );
}
