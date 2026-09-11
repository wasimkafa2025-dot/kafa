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

export function isTaskOneDayBefore(dateStr: string): boolean {
  if (!dateStr) return false;
  
  // 1. Check against Cambodia timezone (UTC+7)
  const tomorrowCambodia = getCambodiaDateStr(1);
  if (dateStr === tomorrowCambodia) return true;

  // 2. Check against client local time
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = getLocalDateStr(tomorrow);

  if (dateStr === tomorrowStr) return true;

  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const taskYear = parseInt(parts[0], 10);
    const taskMonth = parseInt(parts[1], 10) - 1;
    const taskDay = parseInt(parts[2], 10);
    const taskDate = new Date(taskYear, taskMonth, taskDay);
    taskDate.setHours(0, 0, 0, 0);
    const diffMs = taskDate.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return diffDays === 1;
  }

  return false;
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
