export const resolveEarliestAnnotationTimestamp = (
  incomingTimestamp?: string,
  existingTimestamp?: string,
  fallbackTimestamp: string = new Date().toISOString()
): string => {
  const candidates = [incomingTimestamp, existingTimestamp, fallbackTimestamp].filter(
    (timestamp): timestamp is string => !!timestamp
  );

  const oldestValid = candidates.reduce<{ value: string; time: number } | null>((oldest, timestamp) => {
    const parsedTime = Date.parse(timestamp);

    if (Number.isNaN(parsedTime)) {
      return oldest;
    }

    if (!oldest || parsedTime < oldest.time) {
      return { value: timestamp, time: parsedTime };
    }

    return oldest;
  }, null);

  return oldestValid?.value || fallbackTimestamp;
};
