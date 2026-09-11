import type { Status } from "@/lib/domain";

const PIPELINE: Status[] = ["New", "Accepted", "In Progress", "Delivered"];

/** "It should go in order only" — shown so the current step is obvious. */
export default function StageStepper({ status }: { status: Status }) {
  const offPipeline = status === "Cancelled" || status === "Rejected";
  const currentIndex = PIPELINE.indexOf(status);

  return (
    <ol className="flex items-center gap-1">
      {PIPELINE.map((stage, index) => {
        const done = !offPipeline && index < currentIndex;
        const current = !offPipeline && index === currentIndex;
        return (
          <li key={stage} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex w-full items-center gap-1">
              <span
                className={`h-1.5 flex-1 rounded-full ${
                  index === 0
                    ? "bg-transparent"
                    : done || current
                      ? "bg-bark-600"
                      : "bg-bark-200"
                }`}
              />
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  done
                    ? "bg-bark-600 text-white"
                    : current
                      ? "bg-bark-800 text-white ring-4 ring-bark-800/15"
                      : "bg-bark-200 text-bark-500"
                }`}
              >
                {done ? "✓" : index + 1}
              </span>
              <span
                className={`h-1.5 flex-1 rounded-full ${
                  index === PIPELINE.length - 1
                    ? "bg-transparent"
                    : done
                      ? "bg-bark-600"
                      : "bg-bark-200"
                }`}
              />
            </div>
            <span
              className={`text-center text-[11px] leading-tight font-semibold ${
                done || current ? "text-bark-800" : "text-bark-400"
              }`}
            >
              {stage}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
