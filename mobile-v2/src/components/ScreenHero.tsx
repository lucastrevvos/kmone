import { Text, View } from "react-native";

type ScreenHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  badge?: string;
  backgroundColor: string;
  badgeBackgroundColor?: string;
  eyebrowColor?: string;
  titleColor?: string;
  descriptionColor?: string;
};

export default function ScreenHero({
  eyebrow,
  title,
  description,
  badge,
  backgroundColor,
  badgeBackgroundColor = "rgba(255,255,255,0.12)",
  eyebrowColor = "#CBD5E1",
  titleColor = "#FFFFFF",
  descriptionColor = "#E2E8F0",
}: ScreenHeroProps) {
  return (
    <View
      className="rounded-[30px] px-5 py-5"
      style={{ backgroundColor }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-4">
          <Text
            className="text-xs font-semibold uppercase tracking-[1.4px]"
            style={{ color: eyebrowColor }}
          >
            {eyebrow}
          </Text>
          <Text className="mt-2 text-3xl font-bold" style={{ color: titleColor }}>
            {title}
          </Text>
          <Text className="mt-2 text-sm" style={{ color: descriptionColor }}>
            {description}
          </Text>
        </View>

        {badge ? (
          <View
            className="rounded-full px-3 py-2"
            style={{ backgroundColor: badgeBackgroundColor }}
          >
            <Text className="text-xs font-semibold text-white">{badge}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}
