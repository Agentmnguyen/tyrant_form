import type { EventType } from "@/lib/rosterConfig";

export type EventNameLike = {
  eventType: EventType;
  monthYearLabel: string;
  googleSheetTabName?: string;
  name?: string;
};

export function monthYearLabel(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

export function baseEventName(eventType: EventType, date = new Date()) {
  return `${eventType} - ${monthYearLabel(date)}`;
}

export function generateEventNames(eventType: EventType, events: EventNameLike[], date = new Date()) {
  const label = monthYearLabel(date);
  const baseName = `${eventType} - ${label}`;
  const existingNames = new Set(
    events
      .filter((event) => event.eventType === eventType && event.monthYearLabel === label)
      .flatMap((event) => [event.name, event.googleSheetTabName])
      .filter((value): value is string => Boolean(value))
      .map((value) => value.toLowerCase())
  );

  if (!existingNames.has(baseName.toLowerCase())) {
    return {
      name: baseName,
      monthYearLabel: label,
      googleSheetTabName: baseName
    };
  }

  let suffix = 2;
  let candidate = `${baseName} #${suffix}`;

  while (existingNames.has(candidate.toLowerCase())) {
    suffix += 1;
    candidate = `${baseName} #${suffix}`;
  }

  return {
    name: candidate,
    monthYearLabel: label,
    googleSheetTabName: candidate
  };
}
