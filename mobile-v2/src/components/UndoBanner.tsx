import { View, Text, Pressable } from "react-native";

type Props = {
  text: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function UndoBanner({
  text,
  actionLabel = "Desfazer",
  onAction,
}: Props) {
  return (
    <View
      className="rounded-xl border px-3 py-2 flex-row items-center justify-between"
      style={{ borderColor: "#F59E0B", backgroundColor: "#FFFBEB" }}
    >
      <Text style={{ color: "#92400E" }}>{text}</Text>
      {onAction && (
        <Pressable onPress={onAction} className="px-2 py-1">
          <Text style={{ color: "#10B981", fontWeight: "600" }}>
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
