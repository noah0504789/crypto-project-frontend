export function isValidTargetChangeRatePercent(value: string) {
  if (value.trim() === '') {
    return false;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) && numberValue > 0;
}