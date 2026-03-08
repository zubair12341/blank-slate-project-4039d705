import { subDays, startOfDay, endOfDay, setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';

/**
 * Get the business day for a given date based on cutoff time.
 * If the time is before the cutoff, the order belongs to the previous calendar day.
 */
export function getBusinessDate(
  date: Date,
  cutoffHour: number,
  cutoffMinute: number
): Date {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  
  // If time is before cutoff, it belongs to previous calendar day's business day
  if (hours < cutoffHour || (hours === cutoffHour && minutes < cutoffMinute)) {
    return subDays(startOfDay(date), 1);
  }
  
  return startOfDay(date);
}

/**
 * Get the business day start and end times for a given business date.
 * Business day starts at cutoff time and ends at cutoff time the next calendar day.
 */
export function getBusinessDayRange(
  businessDate: Date,
  cutoffHour: number,
  cutoffMinute: number
): { start: Date; end: Date } {
  // Business day starts at cutoff time on the business date
  const start = setMilliseconds(
    setSeconds(
      setMinutes(
        setHours(businessDate, cutoffHour),
        cutoffMinute
      ),
      0
    ),
    0
  );
  
  // Business day ends at cutoff time on the next calendar day
  const nextDay = new Date(businessDate);
  nextDay.setDate(nextDay.getDate() + 1);
  const end = setMilliseconds(
    setSeconds(
      setMinutes(
        setHours(nextDay, cutoffHour),
        cutoffMinute
      ),
      0
    ),
    0
  );
  
  return { start, end };
}

/**
 * Get business days for the last N days from today.
 */
export function getLastNBusinessDays(
  n: number,
  cutoffHour: number,
  cutoffMinute: number
): { businessDate: Date; start: Date; end: Date }[] {
  const today = new Date();
  const currentBusinessDate = getBusinessDate(today, cutoffHour, cutoffMinute);
  
  const days: { businessDate: Date; start: Date; end: Date }[] = [];
  
  for (let i = n - 1; i >= 0; i--) {
    const businessDate = subDays(currentBusinessDate, i);
    const range = getBusinessDayRange(businessDate, cutoffHour, cutoffMinute);
    days.push({
      businessDate,
      ...range,
    });
  }
  
  return days;
}

/**
 * Check if a date falls within a business day range.
 */
export function isWithinBusinessDay(
  date: Date,
  businessDayStart: Date,
  businessDayEnd: Date
): boolean {
  const timestamp = date.getTime();
  return timestamp >= businessDayStart.getTime() && timestamp < businessDayEnd.getTime();
}
