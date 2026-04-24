import { Text, View } from "react-native";

type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  rightSlot?: React.ReactNode;
};

export default function SectionHeader({
  eyebrow,
  title,
  rightSlot,
}: SectionHeaderProps) {
  return (
    <View className="flex-row items-center justify-between">
      <View>
        <Text className="text-xs font-semibold uppercase tracking-[1.4px] text-slate-400">
          {eyebrow}
        </Text>
        <Text className="mt-1 text-2xl font-bold text-slate-900">{title}</Text>
      </View>
      {rightSlot}
    </View>
  );
}
