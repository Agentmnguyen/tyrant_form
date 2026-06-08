export function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function voiceCallSummary(value: boolean | null) {
  if (value === null) return "Not Provided";
  return value ? "Yes" : "No";
}
