export const resolveEarliestAnnotationTimestamp = (
  incomingTimestamp?: string,
  existingTimestamp?: string,
  fallbackTimestamp: string = new Date().toISOString()
): string => {
  return incomingTimestamp || existingTimestamp || fallbackTimestamp;
};
