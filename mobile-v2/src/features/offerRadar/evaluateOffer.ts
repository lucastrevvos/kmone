import type { Settings } from "@core/domain/types";

import type { OfferCapturePayload, OfferDecision } from "./types";

const FALLBACK_TARGET_EARNINGS_PER_KM = 1.5;
const FALLBACK_TARGET_EARNINGS_PER_HOUR = 35;

function getSafePositiveNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

export function evaluateOffer(
  capture: OfferCapturePayload | null,
  settings: Partial<Settings> | null | undefined,
): OfferDecision {
  const targetEarningsPerKm =
    getSafePositiveNumber(settings?.metaMinRSKm) ||
    FALLBACK_TARGET_EARNINGS_PER_KM;
  const targetEarningsPerHour =
    getSafePositiveNumber(settings?.radarMinRSHora) ||
    FALLBACK_TARGET_EARNINGS_PER_HOUR;

  if (!capture) {
    return {
      status: "unknown",
      label: "ANALISANDO",
      reason: "Dados insuficientes para avaliar.",
      offeredValue: 0,
      totalKm: 0,
      totalMinutes: 0,
      earningsPerKm: 0,
      earningsPerHour: 0,
      pickupKm: 0,
      pickupMinutes: 0,
      tripKm: 0,
      tripMinutes: 0,
      targetEarningsPerKm,
      targetEarningsPerHour,
    };
  }

  const offeredValue = getSafePositiveNumber(capture.offeredValue);
  const pickupKm = getSafePositiveNumber(capture.pickupKm);
  const pickupMinutes = getSafePositiveNumber(capture.pickupMinutes);
  const tripKm =
    getSafePositiveNumber(capture.tripKm) ||
    getSafePositiveNumber(capture.estimatedKm);
  const tripMinutes =
    getSafePositiveNumber(capture.tripMinutes) ||
    getSafePositiveNumber(capture.estimatedMinutes);

  const totalKm = pickupKm + tripKm;
  const totalMinutes = pickupMinutes + tripMinutes;

  if (offeredValue <= 0 || totalKm <= 0 || totalMinutes <= 0) {
    return {
      status: "unknown",
      label: "ANALISANDO",
      reason: "Dados insuficientes para avaliar.",
      offeredValue,
      totalKm,
      totalMinutes,
      earningsPerKm: 0,
      earningsPerHour: 0,
      pickupKm,
      pickupMinutes,
      tripKm,
      tripMinutes,
      targetEarningsPerKm,
      targetEarningsPerHour,
    };
  }

  const earningsPerKm = offeredValue / totalKm;
  const earningsPerHour = (offeredValue / totalMinutes) * 60;

  if (
    earningsPerKm >= targetEarningsPerKm * 1.2 &&
    earningsPerHour >= targetEarningsPerHour
  ) {
    return {
      status: "great",
      label: "VALE MUITO A PENA",
      reason: `Compensa: acima da sua meta de R$ ${targetEarningsPerKm.toFixed(2)}/km e bom ganho por hora.`,
      offeredValue,
      totalKm,
      totalMinutes,
      earningsPerKm,
      earningsPerHour,
      pickupKm,
      pickupMinutes,
      tripKm,
      tripMinutes,
      targetEarningsPerKm,
      targetEarningsPerHour,
    };
  }

  if (
    earningsPerKm >= targetEarningsPerKm &&
    earningsPerHour >= targetEarningsPerHour * 0.75
  ) {
    return {
      status: "ok",
      label: "ACEITAVEL",
      reason: `Aceitavel: bate a meta por km, mas o tempo reduz o ganho por hora.`,
      offeredValue,
      totalKm,
      totalMinutes,
      earningsPerKm,
      earningsPerHour,
      pickupKm,
      pickupMinutes,
      tripKm,
      tripMinutes,
      targetEarningsPerKm,
      targetEarningsPerHour,
    };
  }

  const reason =
    earningsPerKm < targetEarningsPerKm
      ? `Nao compensa: abaixo da sua meta minima de R$ ${targetEarningsPerKm.toFixed(2)}/km.`
      : `Nao compensa: o ganho por hora ficou abaixo da sua meta de R$ ${targetEarningsPerHour.toFixed(2)}/h.`;

  return {
    status: "bad",
    label: "NAO COMPENSA",
    reason,
    offeredValue,
    totalKm,
    totalMinutes,
    earningsPerKm,
    earningsPerHour,
    pickupKm,
    pickupMinutes,
    tripKm,
    tripMinutes,
    targetEarningsPerKm,
    targetEarningsPerHour,
  };
}
