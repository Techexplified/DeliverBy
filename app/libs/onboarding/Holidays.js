export const HOLIDAYS = {
  IN: {
    2026: [
      { date: "2026-01-26", name: "Republic Day" },
      { date: "2026-03-04", name: "Holi" },
      { date: "2026-03-21", name: "Id-ul-Fitr" },
      { date: "2026-03-26", name: "Ram Navami" },
      { date: "2026-03-31", name: "Mahavir Jayanti" },
      { date: "2026-04-03", name: "Good Friday" },
      { date: "2026-05-01", name: "Buddha Purnima" },
      { date: "2026-05-27", name: "Id-ul-Zuha (Bakrid)" },
      { date: "2026-06-26", name: "Muharram" },
      { date: "2026-08-15", name: "Independence Day" },
      { date: "2026-08-26", name: "Milad-un-Nabi" },
      { date: "2026-09-04", name: "Janmashtami" },
      { date: "2026-10-02", name: "Mahatma Gandhi Jayanti" },
      { date: "2026-10-20", name: "Dussehra" },
      { date: "2026-11-08", name: "Diwali" },
      { date: "2026-11-24", name: "Guru Nanak Jayanti" },
      { date: "2026-12-25", name: "Christmas Day" },
    ],
  },

  US: {
    2026: [
      { date: "2026-01-01", name: "New Year's Day" },
      { date: "2026-01-19", name: "Martin Luther King Jr. Day" },
      { date: "2026-02-16", name: "Washington's Birthday" },
      { date: "2026-05-25", name: "Memorial Day" },
      { date: "2026-06-19", name: "Juneteenth" },
      { date: "2026-07-03", name: "Independence Day (Observed)" },
      { date: "2026-09-07", name: "Labor Day" },
      { date: "2026-10-12", name: "Columbus Day" },
      { date: "2026-11-11", name: "Veterans Day" },
      { date: "2026-11-26", name: "Thanksgiving Day" },
      { date: "2026-12-25", name: "Christmas Day" },
    ],
  },
};


export function PublicHolidays(countryCode, formData) {
    const closures = formData?.closures || [];
    const holidays = HOLIDAYS[countryCode]?.[2026] || [];
    const today = new Date();
    const holidaysAdded = holidays
    .filter((h)=> (!closures.some(c => c.date === h.date) && h.date >= today.toISOString().split('T')[0]))
    .map((h) => ({
        date: h.date,
        reason: h.name,
    }));

    return holidaysAdded;
}