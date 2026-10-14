// Склонение «Имя Фамилия» для текстов модератора: «У Анны Смирновой две брони»,
// «Марии Лебедевой придёт уведомление». Правила упрощённые — под русские имена и фамилии на -ов/-ев/-ин.

type Case = 'gen' | 'dat';

const MALE_ON_A = new Set(['Никита', 'Илья', 'Фома', 'Лука', 'Кузьма', 'Савва', 'Данила', 'Миша', 'Саша', 'Женя']);

export function isFemale(fullName: string): boolean {
  const first = fullName.trim().split(/\s+/)[0] ?? '';
  return /[ая]$/.test(first) && !MALE_ON_A.has(first);
}

function firstName(name: string, female: boolean, c: Case): string {
  if (/ия$/.test(name)) return name.slice(0, -1) + 'и';
  if (/я$/.test(name)) return name.slice(0, -1) + (c === 'gen' ? 'и' : 'е');
  if (/а$/.test(name)) {
    const soft = /[гкхжшщч]а$/.test(name);
    return name.slice(0, -1) + (c === 'gen' ? (soft ? 'и' : 'ы') : 'е');
  }
  if (female) return name;
  if (/[йь]$/.test(name)) return name.slice(0, -1) + (c === 'gen' ? 'я' : 'ю');
  return name + (c === 'gen' ? 'а' : 'у');
}

function surname(name: string, female: boolean, c: Case): string {
  if (female) {
    if (/(ова|ева|ёва|ина|ына)$/.test(name)) return name.slice(0, -1) + 'ой';
    if (/ая$/.test(name)) return name.slice(0, -2) + 'ой';
    return name;
  }
  if (/(ов|ев|ёв|ин|ын)$/.test(name)) return name + (c === 'gen' ? 'а' : 'у');
  if (/ий$/.test(name)) return name.slice(0, -2) + (c === 'gen' ? 'ого' : 'ому');
  return name;
}

export function declineName(fullName: string, c: Case): string {
  const [first = '', ...rest] = fullName.trim().split(/\s+/);
  const female = isFemale(fullName);
  return [firstName(first, female, c), ...rest.map((s) => surname(s, female, c))].join(' ');
}

/** «две», «три», «четыре» для «две брони»; дальше — цифрой. */
export function countWord(n: number): string {
  return ['ноль', 'одна', 'две', 'три', 'четыре'][n] ?? String(n);
}
