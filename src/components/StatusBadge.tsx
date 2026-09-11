import type { Status } from "@/lib/domain";
import { STATUS_STYLES } from "@/lib/statusStyles";

export default function StatusBadge({
  status,
  className = "",
}: {
  status: Status;
  className?: string;
}) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${style.badge} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {status}
    </span>
  );
}
