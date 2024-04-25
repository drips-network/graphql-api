const getUnixTime = (date: Date): number => date.getTime() / 1000;

type CycleInfo = {
  cycleDurationSecs: bigint;
  currentCycleSecs: bigint;
  currentCycleStartDate: Date;
  nextCycleStartDate: Date;
};

const DRIPS_CYCLE_SECONDS = 604800n;

export default function getCycleInfo(): CycleInfo {
  const currentCycleSecs =
    BigInt(Math.floor(getUnixTime(new Date()))) % DRIPS_CYCLE_SECONDS;

  const currentCycleStartDate = new Date(
    new Date().getTime() - Number(currentCycleSecs) * 1000,
  );

  const nextCycleStartDate = new Date(
    currentCycleStartDate.getTime() +
      Number(DRIPS_CYCLE_SECONDS * BigInt(1000)),
  );

  return {
    cycleDurationSecs: DRIPS_CYCLE_SECONDS,
    currentCycleSecs,
    currentCycleStartDate,
    nextCycleStartDate,
  };
}
