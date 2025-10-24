import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { ridesToCSV } from "@utils/csv";
import type { Ride } from "@core/domain/types";

export async function exportDayCsv(dateISO: string, rides: Ride[]) {
  const csv = ridesToCSV(rides);
  const filename = `kmone-rides-${dateISO}.csv`;

  // caminho seguro — documentDirectory sempre existe no Expo
  const dir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? "";
  const uri = `${dir}${filename}`;

  await FileSystem.writeAsStringAsync(uri, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  // verifica suporte a compartilhamento
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      dialogTitle: `Exportar corridas • ${dateISO}`,
      UTI: "public.comma-separated-values-text",
      mimeType: "text/csv",
    });
  } else {
    console.log("Arquivo CSV salvo em:", uri);
  }

  return uri;
}
