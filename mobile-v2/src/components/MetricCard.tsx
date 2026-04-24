import { Text, View } from "react-native";

type MetricCardProps = {
  label: string;
  value: string;
  note: string;
  emphasis?: "default" | "success" | "warning";
  variant?: "default" | "dark";
};

export default function MetricCard({
  label,
  value,
  note,
  emphasis = "default",
  variant = "default",
}: MetricCardProps) {
  const defaultNoteColor =
    emphasis === "warning"
      ? "#B45309"
      : emphasis === "success"
        ? "#166534"
        : "#64748B";

  if (variant === "dark") {
    return (
      <View
        className="mb-3 rounded-[24px] p-4"
        style={{ width: "48%", backgroundColor: "rgba(255,255,255,0.12)" }}
      >
        <Text className="text-sm text-emerald-100">{label}</Text>
        <Text className="mt-2 text-xl font-bold text-white">{value}</Text>
        <Text className="mt-2 text-xs font-semibold text-emerald-200">{note}</Text>
      </View>
    );
  }

  return (
    <View
      className="mb-3 rounded-[24px] border border-slate-200 p-4"
      style={{ width: "48%", backgroundColor: "#FFFFFF" }}
    >
      <Text className="text-sm text-slate-500">{label}</Text>
      <Text className="mt-2 text-xl font-bold text-slate-900">{value}</Text>
      <Text className="mt-2 text-xs font-semibold" style={{ color: defaultNoteColor }}>
        {note}
      </Text>
    </View>
  );
}
