export function getLocalDateStr(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isTaskOneDayBefore(dateStr: string): boolean {
  if (!dateStr) return false;
  
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
