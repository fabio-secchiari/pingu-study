import type { IglooSettings } from '../types';

export interface SpecialDay {
  kind: 'anniversario' | 'mesiversario' | 'compleanno-pet' | 'san-valentino' | 'natale';
  title: string;
  subtitle: string;
  emoji: string;
}

/** Mesi interi dall'inizio della relazione (per la pagina Igloo). */
export function monthsTogether(anniversary: string, now = new Date()): number {
  const [y, m, d] = anniversary.split('-').map(Number);
  let months = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
  if (now.getDate() < d) months--;
  return Math.max(0, months);
}

/** Età in giorni del pinguino domestico. */
export function petAgeDays(birthday: string, now = new Date()): number {
  const [y, m, d] = birthday.split('-').map(Number);
  const born = new Date(y, m - 1, d).getTime();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((today - born) / 86400000);
}

export function specialDays(igloo: IglooSettings, now = new Date()): SpecialDay[] {
  const out: SpecialDay[] = [];
  const md = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const [annY, annM, annD] = igloo.anniversary.split('-').map(Number);
  const [, petM, petD] = igloo.petBirthday.split('-').map(Number);
  const months = (now.getFullYear() - annY) * 12 + (now.getMonth() + 1 - annM);

  if (now.getMonth() + 1 === annM && now.getDate() === annD && now.getFullYear() > annY) {
    const years = now.getFullYear() - annY;
    out.push({
      kind: 'anniversario',
      title: `Buon ${years}° anniversario! 💕`,
      subtitle: `${years === 1 ? 'Un anno' : `${years} anni`} insieme nello stesso igloo. Oggi niente ansia da esame, solo coccole.`,
      emoji: '💕',
    });
  } else if (now.getDate() === annD && months > 0) {
    out.push({
      kind: 'mesiversario',
      title: `Buon ${months}° mesiversario! 💗`,
      subtitle: `${months} mesi insieme dal ${new Date(annY, annM - 1, annD).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}. Un pomodoro insieme per festeggiare?`,
      emoji: '💗',
    });
  }

  if (now.getMonth() + 1 === petM && now.getDate() === petD) {
    const [by] = igloo.petBirthday.split('-').map(Number);
    const years = now.getFullYear() - by;
    out.push({
      kind: 'compleanno-pet',
      title: `Buon compleanno ${igloo.petName}! 🎂`,
      subtitle: `Oggi compie ${years} ${years === 1 ? 'anno' : 'anni'} (${petAgeDays(igloo.petBirthday, now)} giorni). Pesciolini doppi per festeggiare!`,
      emoji: '🎂',
    });
  } else {
    const age = petAgeDays(igloo.petBirthday, now);
    if (age > 0 && age % 100 === 0) {
      out.push({
        kind: 'compleanno-pet',
        title: `${igloo.petName} compie ${age} giorni! 🐧`,
        subtitle: 'Traguardo tondo: merita un pesciolino in più.',
        emoji: '🐟',
      });
    }
  }

  if (md === '02-14') {
    out.push({ kind: 'san-valentino', title: 'Buon San Valentino 💘', subtitle: 'I pinguini scelgono un compagno per la vita.', emoji: '💘' });
  }
  if (md === '12-25') {
    out.push({ kind: 'natale', title: 'Buon Natale! 🎄', subtitle: 'Anche i pinguini si riposano oggi.', emoji: '🎄' });
  }
  return out;
}
