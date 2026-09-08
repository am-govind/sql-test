/**
 * Quick date picker component with Day, Month, and Year selectors.
 * Directly outputs ISO 'YYYY-MM-DD' formatted date string to a hidden input
 * so users can jump straight to any year and month without paging month-by-month.
 */

export function renderDobSelector({
  id = 'dob',
  name = 'dob',
  required = true,
  startYear = 1970,
  endYear = new Date().getFullYear(),
  defaultYear = 2004,
  defaultMonth = 1,
  defaultDay = 1,
} = {}) {
  const months = [
    { num: '01', name: 'Jan' },
    { num: '02', name: 'Feb' },
    { num: '03', name: 'Mar' },
    { num: '04', name: 'Apr' },
    { num: '05', name: 'May' },
    { num: '06', name: 'Jun' },
    { num: '07', name: 'Jul' },
    { num: '08', name: 'Aug' },
    { num: '09', name: 'Sep' },
    { num: '10', name: 'Oct' },
    { num: '11', name: 'Nov' },
    { num: '12', name: 'Dec' },
  ];

  const yearOptions = [];
  for (let y = endYear; y >= startYear; y--) {
    yearOptions.push(`<option value="${y}" ${y === defaultYear ? 'selected' : ''}>${y}</option>`);
  }

  const monthOptions = months.map((m, idx) => {
    const isSelected = idx + 1 === defaultMonth ? 'selected' : '';
    return `<option value="${m.num}" ${isSelected}>${m.num} - ${m.name}</option>`;
  }).join('');

  const dayOptions = [];
  for (let d = 1; d <= 31; d++) {
    const str = String(d).padStart(2, '0');
    dayOptions.push(`<option value="${str}" ${d === defaultDay ? 'selected' : ''}>${str}</option>`);
  }

  const initialVal = `${defaultYear}-${String(defaultMonth).padStart(2, '0')}-${String(defaultDay).padStart(2, '0')}`;

  return `
    <div class="dob-picker-group" data-dob-picker="${id}">
      <input type="hidden" id="${id}" name="${name}" value="${initialVal}" ${required ? 'required' : ''} />
      <div class="grid grid-cols-3 gap-2 mt-1">
        <select class="dob-day w-full px-2 py-2 text-sm bg-white cursor-pointer" aria-label="Day">
          ${dayOptions.join('')}
        </select>
        <select class="dob-month w-full px-2 py-2 text-sm bg-white cursor-pointer" aria-label="Month">
          ${monthOptions}
        </select>
        <select class="dob-year w-full px-2 py-2 text-sm bg-white cursor-pointer" aria-label="Year">
          ${yearOptions.join('')}
        </select>
      </div>
    </div>
  `;
}

/**
 * Initializes listeners to keep the hidden YYYY-MM-DD input updated
 * and handle variable days per month (28/29/30/31).
 */
export function initDobPicker(container, id = 'dob') {
  const root = container.querySelector(`[data-dob-picker="${id}"]`);
  if (!root) return;

  const hiddenInput = root.querySelector(`#${id}`);
  const daySelect = root.querySelector('.dob-day');
  const monthSelect = root.querySelector('.dob-month');
  const yearSelect = root.querySelector('.dob-year');

  function updateDays() {
    const year = parseInt(yearSelect.value, 10);
    const month = parseInt(monthSelect.value, 10);
    const maxDays = new Date(year, month, 0).getDate();
    const currentDay = parseInt(daySelect.value, 10);

    const prevCount = daySelect.options.length;
    if (prevCount !== maxDays) {
      daySelect.innerHTML = Array.from({ length: maxDays }, (_, i) => {
        const val = String(i + 1).padStart(2, '0');
        return `<option value="${val}">${val}</option>`;
      }).join('');

      daySelect.value = String(Math.min(currentDay || 1, maxDays)).padStart(2, '0');
    }

    hiddenInput.value = `${yearSelect.value}-${monthSelect.value}-${daySelect.value}`;
    hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
  }

  daySelect.addEventListener('change', updateDays);
  monthSelect.addEventListener('change', updateDays);
  yearSelect.addEventListener('change', updateDays);

  updateDays();
}
