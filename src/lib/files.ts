// Файлы: чтение CSV/XLSX для импорта каталога (SheetJS), выгрузка CSV через «Поделиться», выбор обложки.
import * as DocumentPicker from 'expo-document-picker';
import type { DocumentPickerAsset } from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import * as XLSX from 'xlsx';

import type { ImportRow } from '@/db';

export type CatalogField = 'title' | 'author' | 'isbn' | 'copies' | 'cover' | 'none';

export const FIELD_LABEL: Record<CatalogField, string> = {
  title: 'Название',
  author: 'Автор',
  isbn: 'ISBN',
  copies: 'Количество',
  cover: 'Обложка',
  none: 'Не импортировать',
};

export const REQUIRED_FIELDS: CatalogField[] = ['title', 'author', 'copies'];

export type Sheet = { fileName: string; headers: string[]; rows: string[][] };

export async function readSpreadsheet(asset: DocumentPickerAsset): Promise<Sheet> {
  const data =
    Platform.OS === 'web' && asset.file
      ? new Uint8Array(await asset.file.arrayBuffer())
      : await new File(asset.uri).bytes();
  const isCsv = /\.csv$/i.test(asset.name) || /csv/.test(asset.mimeType ?? '');
  const book = isCsv ? XLSX.read(decodeCsv(data), { type: 'string' }) : XLSX.read(data, { type: 'array' });
  const first = book.Sheets[book.SheetNames[0]];
  // header: 1 — массив строк; значения приводим к строкам, пустые ячейки — ''.
  const table = XLSX.utils.sheet_to_json<unknown[]>(first, { header: 1, defval: '', blankrows: false });
  const [head = [], ...body] = table;
  return {
    fileName: asset.name,
    headers: head.map((h) => String(h).trim()),
    rows: body.map((r) => r.map((c) => String(c).trim())),
  };
}

/** CSV: UTF-8 (с BOM или без), иначе Windows-1251 — так сохраняет Excel с русской локалью. */
function decodeCsv(bytes: Uint8Array): string {
  const utf8 = new TextDecoder('utf-8').decode(bytes);
  // Символ замены U+FFFD значит, что байты не UTF-8.
  if (!utf8.includes("\uFFFD")) return utf8.replace(/^\uFEFF/, '');
  let out = '';
  for (const b of bytes) {
    if (b >= 0xc0) out += String.fromCharCode(0x0410 + (b - 0xc0));
    else if (b === 0xa8) out += 'Ё';
    else if (b === 0xb8) out += 'ё';
    else out += String.fromCharCode(b);
  }
  return out;
}

/** Сопоставление колонок по заголовкам: «Наименование» → Название, «Кол-во» → Количество и т. д. */
export function autoMap(headers: string[]): CatalogField[] {
  const used = new Set<CatalogField>();
  return headers.map((h) => {
    const n = h.toLocaleLowerCase('ru-RU');
    const field: CatalogField = /назв|наимен|title/.test(n)
      ? 'title'
      : /автор|author/.test(n)
        ? 'author'
        : /isbn/.test(n)
          ? 'isbn'
          : /кол|экз|copies|count/.test(n)
            ? 'copies'
            : /облож|cover/.test(n)
              ? 'cover'
              : 'none';
    if (field === 'none' || used.has(field)) return 'none';
    used.add(field);
    return field;
  });
}

export function toImportRows(sheet: Sheet, mapping: CatalogField[]): ImportRow[] {
  const col = (f: CatalogField) => mapping.indexOf(f);
  const get = (row: string[], f: CatalogField) => (col(f) >= 0 ? (row[col(f)] ?? '') : '');
  return sheet.rows.map((row, i) => ({
    line: i + 2,
    title: get(row, 'title'),
    author: get(row, 'author'),
    isbn: get(row, 'isbn'),
    copies: Number(get(row, 'copies').replace(',', '.')),
    coverUri: get(row, 'cover'),
  }));
}

function csv(rows: string[][]): string {
  return rows.map((r) => r.map((c) => (/[",;\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',')).join('\n');
}

/** Сохраняет CSV во временную папку и открывает «Поделиться». В web-превью недоступно. */
export async function shareCsv(fileName: string, rows: string[][]): Promise<boolean> {
  if (Platform.OS === 'web' || !(await Sharing.isAvailableAsync())) return false;
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write('﻿' + csv(rows));
  await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: fileName });
  return true;
}

export const TEMPLATE_ROWS: string[][] = [
  ['Название', 'Автор', 'ISBN', 'Количество', 'Обложка (ссылка)'],
];

/** Выбор картинки обложки: копия в папку документов приложения, чтобы файл не пропал из кэша. */
export async function pickCoverImage(): Promise<string | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ['image/jpeg', 'image/png'], copyToCacheDirectory: true });
  const asset = res.canceled ? null : res.assets[0];
  if (!asset) return null;
  if (Platform.OS === 'web') return asset.uri;
  const ext = /\.png$/i.test(asset.name) ? 'png' : 'jpg';
  const dest = new File(Paths.document, `cover-${Date.now()}.${ext}`);
  await new File(asset.uri).copy(dest);
  return dest.uri;
}
