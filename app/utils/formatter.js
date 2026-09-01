// app/utils/formatter.js
import { format, differenceInCalendarDays } from "date-fns";

/**
 * Formats a date range or single date based on dateFormat and dateStyle
 */
export function formatDateValue({
  arriveMin,
  arriveMax,
  dateFormat = "range",
  dateStyle = "full",
  currentDate = new Date(),
}) {
  if (!arriveMin || !arriveMax) return "";

  // 1. Days from now (e.g. "in 6–10 days" or "in 5 days")
  if (dateFormat === "days") {
    const minDays = Math.max(0, differenceInCalendarDays(arriveMin, currentDate));
    const maxDays = Math.max(minDays, differenceInCalendarDays(arriveMax, currentDate));

    if (minDays === maxDays) {
      return `in ${minDays} day${minDays === 1 ? "" : "s"}`;
    }
    return `in ${minDays}–${maxDays} days`;
  }

  // 2. Single date (e.g. "by Friday, 11 September")
  if (dateFormat === "single") {
    const target = arriveMax;
    let formatted = "";

    switch (dateStyle) {
      case "medium":
        formatted = format(target, "EEE, d MMM"); // "Fri, 11 Sep"
        break;
      case "short":
        formatted = format(target, "dd/MM"); // "11/09"
        break;
      case "day":
        formatted = format(target, "EEEE"); // "Friday"
        break;
      case "full":
      default:
        formatted = format(target, "EEEE, d MMMM"); // "Friday, 11 September"
        break;
    }

    return `by ${formatted}`;
  }

  // 3. Date range (e.g. "7–11 September")
  const sameMonth = arriveMin.getMonth() === arriveMax.getMonth();
  const sameYear = arriveMin.getFullYear() === arriveMax.getFullYear();
  const sameDay = arriveMin.getDate() === arriveMax.getDate() && sameMonth && sameYear;

  switch (dateStyle) {
    case "medium": {
      if (sameDay) return format(arriveMin, "EEE d MMM");
      if (sameMonth) return `${format(arriveMin, "EEE d")} – ${format(arriveMax, "EEE d MMM")}`;
      return `${format(arriveMin, "EEE d MMM")} – ${format(arriveMax, "EEE d MMM")}`;
    }
    case "short": {
      if (sameDay) return format(arriveMin, "dd/MM");
      return `${format(arriveMin, "dd/MM")} – ${format(arriveMax, "dd/MM")}`;
    }
    case "day": {
      if (sameDay) return format(arriveMin, "EEEE");
      return `${format(arriveMin, "EEEE")} – ${format(arriveMax, "EEEE")}`;
    }
    case "full":
    default: {
      if (sameDay) return format(arriveMin, "d MMMM");
      if (sameMonth) return `${format(arriveMin, "d")}–${format(arriveMax, "d MMMM")}`;
      return `${format(arriveMin, "d MMMM")} – ${format(arriveMax, "d MMMM")}`;
    }
  }
}

/**
 * Replaces tokens in a line template (e.g. "Get it {date}")
 */
export function formatDeliveryLine({
  template = "Get it {date}",
  arriveMin,
  arriveMax,
  dateFormat = "range",
  dateStyle = "full",
  zoneName = "India domestic",
  currentDate = new Date(),
}) {
  if (!template) return "";

  const formattedDate = formatDateValue({
    arriveMin,
    arriveMax,
    dateFormat,
    dateStyle,
    currentDate,
  });

  const minDays = arriveMin ? Math.max(0, differenceInCalendarDays(arriveMin, currentDate)) : 1;
  const maxDays = arriveMax ? Math.max(minDays, differenceInCalendarDays(arriveMax, currentDate)) : 2;
  const daysText = minDays === maxDays ? `${minDays} days` : `${minDays}–${maxDays} days`;

  let result = template
    .replace(/\{date\}/gi, formattedDate)
    .replace(/\{days\}/gi, daysText)
    .replace(/\{zone\}/gi, zoneName)
    .replace(/\{country\}/gi, zoneName);

  return result;
}
