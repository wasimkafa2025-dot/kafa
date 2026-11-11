export function getLocalDateStr(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCambodiaDateStr(offsetDays = 0): string {
  const target = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Phnom_Penh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(target);
  const year = parts.find(p => p.type === 'year')?.value || '';
  const month = parts.find(p => p.type === 'month')?.value || '';
  const day = parts.find(p => p.type === 'day')?.value || '';
  return `${year}-${month}-${day}`;
}

/**
 * Calculates task exact due timestamp in milliseconds with Cambodia (UTC+7) timezone awareness
 */
export function getTaskDueTimestamp(dateStr: string, timeStr?: string): number {
  if (!dateStr) return 0;
  const time = timeStr && timeStr.includes(':') ? timeStr.trim() : '08:00';
  const paddedTime = time.length === 5 ? time : time.padStart(5, '0');
  const isoStr = `${dateStr}T${paddedTime}:00+07:00`;
  const d = new Date(isoStr);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

export interface TaskAlertCheckResult {
  shouldAlert: boolean;
  alertType: 'one_day_before' | 'twenty_four_hours' | 'due_today' | null;
  hoursRemaining: number;
  isTomorrow: boolean;
  isToday: boolean;
  readableRemainingKhmer: string;
  readableRemainingEnglish: string;
}

/**
 * Checks whether a task qualifies for advance Telegram alert:
 * 1) 1 ថ្ងៃមុន (Tomorrow in Cambodia UTC+7 calendar date)
 * 2) ឬ ២៤ ម៉ោងមុនពេលមកដល់នៃភារកិច្ច (Due within 24 hours of arrival)
 * 3) កិច្ចការថ្ងៃនេះ (Due today before arrival or within 2h grace window)
 */
export function checkTaskAdvanceAlert(dateStr: string, timeStr?: string): TaskAlertCheckResult {
  if (!dateStr) {
    return {
      shouldAlert: false,
      alertType: null,
      hoursRemaining: 0,
      isTomorrow: false,
      isToday: false,
      readableRemainingKhmer: '',
      readableRemainingEnglish: ''
    };
  }

  // Cambodia dates (Asia/Phnom_Penh, UTC+7)
  const todayCambodia = getCambodiaDateStr(0);
  const tomorrowCambodia = getCambodiaDateStr(1);

  const isToday = (dateStr === todayCambodia);
  const isTomorrow = (dateStr === tomorrowCambodia);

  const taskTimeMs = getTaskDueTimestamp(dateStr, timeStr);
  const nowMs = Date.now();
  const diffMs = taskTimeMs - nowMs;
  const hoursRemaining = diffMs / (1000 * 60 * 60);

  // Human-readable remaining time strings
  let readableRemainingKhmer = '';
  let readableRemainingEnglish = '';
  if (hoursRemaining > 24) {
    const days = Math.round(hoursRemaining / 24);
    readableRemainingKhmer = `ប្រហែល ${days} ថ្ងៃទៀត`;
    readableRemainingEnglish = `About ${days} day(s) remaining`;
  } else if (hoursRemaining > 0) {
    const hrs = Math.floor(hoursRemaining);
    const mins = Math.round((hoursRemaining - hrs) * 60);
    readableRemainingKhmer = hrs > 0 ? `សល់ ${hrs} ម៉ោង ${mins} នាទីទៀត` : `សល់ ${mins} នាទីទៀត`;
    readableRemainingEnglish = hrs > 0 ? `${hrs}h ${mins}m remaining` : `${mins}m remaining`;
  } else if (hoursRemaining >= -2) {
    readableRemainingKhmer = `ដល់ពេលវេលាកំណត់ហើយ`;
    readableRemainingEnglish = `Due now`;
  } else {
    readableRemainingKhmer = `ហួសកាលកំណត់`;
    readableRemainingEnglish = `Past due`;
  }

  // Verification conditions:
  // - 1 ថ្ងៃមុន (Tomorrow's date in Cambodia timezone)
  // - ឬ ២៤ ម៉ោងមុនពេលមកដល់ (Within 24 hours of task arrival, including up to 2 hours grace if app was just opened)
  let shouldAlert = false;
  let alertType: 'one_day_before' | 'twenty_four_hours' | 'due_today' | null = null;

  if (isTomorrow) {
    shouldAlert = true;
    alertType = 'one_day_before';
  } else if (hoursRemaining <= 24 && hoursRemaining >= -2) {
    shouldAlert = true;
    alertType = isToday ? 'due_today' : 'twenty_four_hours';
  } else if (isToday) {
    // If today and not past due by more than 2 hours
    shouldAlert = true;
    alertType = 'due_today';
  }

  return {
    shouldAlert,
    alertType,
    hoursRemaining,
    isTomorrow,
    isToday,
    readableRemainingKhmer,
    readableRemainingEnglish
  };
}

export function isTaskOneDayBefore(dateStr: string, timeStr?: string): boolean {
  if (!dateStr) return false;
  const res = checkTaskAdvanceAlert(dateStr, timeStr);
  return res.shouldAlert;
}

export function getMonthNameFromDateStr(dateStr: string): string {
  if (!dateStr) return 'July';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, monthIndex, day);
    return d.toLocaleString('en-US', { month: 'long' });
  }
  return 'July';
}
