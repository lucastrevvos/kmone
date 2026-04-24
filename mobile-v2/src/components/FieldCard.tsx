import type { ReactNode } from "react";
import { Text, View } from "react-native";

type FieldCardProps = {
  label: string;
  helperText?: string;
  children: ReactNode;
};

export default function FieldCard({
  label,
  helperText,
  children,
}: FieldCardProps) {
  return (
    <View className="mt-4">
      <Text className="mb-2 text-sm text-slate-600">{label}</Text>
      {children}
      {helperText ? (
        <Text className="mt-2 text-xs text-slate-500">{helperText}</Text>
      ) : null}
    </View>
  );
}
