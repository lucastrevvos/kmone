import { useEffect, useState } from "react";
import { fetchCorridas } from "../services/api";
import { View, Text, ScrollView } from "react-native";

export default function Home() {
  const [corridas, setCorridas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCorridas()
      .then((data) => setCorridas(data.items || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-100">
        <Text className="text-lg">Carregando...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white p-4">
      {corridas.map((c, i) => (
        <View key={i}>
          <Text>Valor: R$ {c.valor_recebido}</Text>
          <Text>Km: {c.km_rodado}</Text>
          <Text>Lucro: R$ {c.lucro_liquido}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
