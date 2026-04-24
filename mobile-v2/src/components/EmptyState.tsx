import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type EmptyStateProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionSlot?: ReactNode;
};

export default function EmptyState({
  icon,
  title,
  description,
  actionSlot,
}: EmptyStateProps) {
  return (
    <View
      className="items-center rounded-[28px] border border-dashed border-slate-300 px-6 py-10"
      style={{ backgroundColor: "#FFFFFF" }}
    >
      <Ionicons name={icon} size={28} color="#94A3B8" />
      <Text className="mt-3 text-lg font-semibold text-slate-800">{title}</Text>
      <Text className="mt-1 text-center text-sm text-slate-500">
        {description}
      </Text>
      {actionSlot ? <View className="mt-4">{actionSlot}</View> : null}
    </View>
  );
}
