export const MAX_PER_SLOT = 3;

const MORNING_SLOT_MWF = { id: "07:00", label: "07:00" }; // lunes, miércoles, viernes
const MORNING_SLOT_TTS = { id: "08:00", label: "08:00" }; // martes, jueves, sábado
const AFTERNOON_SLOTS = [
  { id: "18:00", label: "18:00" },
  { id: "19:00", label: "19:00" },
];

export const ALL_SLOTS = [MORNING_SLOT_MWF, MORNING_SLOT_TTS, ...AFTERNOON_SLOTS];

// day: valor de date-fns getDay() → 0 domingo … 6 sábado
export function getSlotsForDay(day: number) {
  if (day === 1 || day === 3 || day === 5) return [MORNING_SLOT_MWF, ...AFTERNOON_SLOTS];
  if (day === 2 || day === 4)              return [MORNING_SLOT_TTS, ...AFTERNOON_SLOTS];
  if (day === 6)                           return [MORNING_SLOT_TTS];
  return [];
}

export const WHATSAPP_NUMBER = "543764114013";
export const CONTACT_EMAIL   = "aquilaevolucion@gmail.com";
