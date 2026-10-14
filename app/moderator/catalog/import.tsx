// M4 · Импорт из таблицы. Шаги: файл → колонки → проверка → готово; «Импорт прерван».
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  AppText,
  BottomSheet,
  Button,
  Cell,
  CounterPill,
  DataTable,
  Dropzone,
  IconButton,
  MenuGroup,
  MenuItem,
  Notice,
  Panel,
  SegmentedControl,
  Select,
  StatusChip,
  StatusIcon,
  Steps,
  TwoToneTitle,
  type Column,
} from '@/components';
import { checkImportRows, commitImport, type CheckedRow, type DuplicateMode, type ImportResult, type ImportSummary } from '@/db';
import { plural } from '@/lib/format';
import {
  autoMap,
  FIELD_LABEL,
  readSpreadsheet,
  REQUIRED_FIELDS,
  shareCsv,
  TEMPLATE_ROWS,
  toImportRows,
  type CatalogField,
  type Sheet,
} from '@/lib/spreadsheet';
import { colors, fonts, radius, space, status, typography, ui, type StatusTone } from '@/theme/tokens';

type Step = 'upload' | 'mapping' | 'preview' | 'result' | 'error';
type Filter = 'all' | 'new' | 'exists' | 'error';

const STEP_INDEX: Record<Step, number> = { upload: 0, mapping: 1, preview: 2, result: 3, error: 2 };

const ERROR_LABEL = {
  noTitle: 'Нет названия',
  noAuthor: 'Нет автора',
  badIsbn: 'ISBN неверного формата',
  badCopies: 'Неверное количество',
} as const;

function checkChip(r: CheckedRow): { label: string; tone: StatusTone } {
  if (r.check.kind === 'error') return { label: ERROR_LABEL[r.check.error], tone: 'overdue' };
  if (r.check.kind === 'exists') return { label: 'Есть в каталоге · +экз.', tone: 'neutral' };
  return { label: 'Будет добавлена', tone: 'available' };
}

const books = (n: number) => plural(n, ['книга', 'книги', 'книг']);

export default function ImportScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('upload');
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [mapping, setMapping] = useState<CatalogField[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [mode, setMode] = useState<DuplicateMode>('increase');
  const [filter, setFilter] = useState<Filter>('all');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [picking, setPicking] = useState<number | null>(null);
  const [readError, setReadError] = useState(false);
  const [busy, setBusy] = useState(false);

  const toCatalog = () => router.navigate('/moderator/catalog');

  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets[0]) return;
    try {
      const s = await readSpreadsheet(res.assets[0]);
      setSheet(s);
      setMapping(autoMap(s.headers));
      setReadError(false);
      setStep('mapping');
    } catch {
      setReadError(true);
    }
  };

  const toPreview = async () => {
    if (!sheet) return;
    setBusy(true);
    try {
      setSummary(await checkImportRows(toImportRows(sheet, mapping)));
      setFilter('all');
      setStep('preview');
    } finally {
      setBusy(false);
    }
  };

  const run = async () => {
    if (!summary) return;
    setBusy(true);
    try {
      setResult(await commitImport(summary, mode));
      setStep('result');
    } catch {
      setStep('error');
    } finally {
      setBusy(false);
    }
  };

  const errorRows = (summary?.rows ?? []).filter((r) => r.check.kind === 'error');
  const downloadErrors = () =>
    void shareCsv('ошибки_импорта.csv', [
      ['Строка', 'Название', 'Автор', 'ISBN', 'Количество', 'Проверка'],
      ...errorRows.map((r) => [String(r.line), r.title, r.author, r.isbn, String(r.copies || ''), checkChip(r).label]),
    ]);

  const requiredOk = REQUIRED_FIELDS.every((f) => mapping.includes(f));

  let body;
  if (step === 'upload') {
    body = (
      <Dropzone>
        <StatusIcon icon="fileUpload" tone="available" shape="rounded" />
        <AppText variant="title" align="center">
          Перетащите таблицу сюда
        </AppText>
        <AppText tone="secondary" align="center" style={styles.lead}>
          CSV или XLSX. Нужны колонки с названием, автором и количеством экземпляров; ISBN и обложка — по желанию.
        </AppText>
        {readError && <Notice tone="overdue" text="Не удалось прочитать файл. Проверьте, что это CSV или XLSX." />}
        <View style={styles.row}>
          <Button label="Выбрать файл" variant="dark" onPress={() => void pick()} />
          <Button label="Скачать шаблон таблицы" variant="secondary" onPress={() => void shareCsv('шаблон_каталога.csv', TEMPLATE_ROWS)} />
        </View>
      </Dropzone>
    );
  } else if (step === 'mapping' && sheet) {
    body = (
      <>
        <View style={styles.fileCard}>
          <StatusIcon icon="fileSheet" tone="available" size={44} shape="rounded" />
          <View style={styles.flex}>
            <Text style={styles.fileName}>{sheet.fileName}</Text>
            <AppText variant="caption" tone="secondary">
              {sheet.rows.length} {plural(sheet.rows.length, ['строка', 'строки', 'строк'])} · {sheet.headers.length}{' '}
              {plural(sheet.headers.length, ['колонка', 'колонки', 'колонок'])}
            </AppText>
          </View>
          <Button label="Заменить файл" variant="tertiary" size="md" onPress={() => void pick()} />
        </View>
        <View style={styles.mapCard}>
          <View style={[styles.mapRow, styles.mapHead]}>
            {['Колонка в файле', 'Пример значения', 'Поле каталога'].map((t) => (
              <Text key={t} style={[styles.th, styles.flex]}>
                {t}
              </Text>
            ))}
          </View>
          {sheet.headers.map((h, i) => (
            <View key={`${h}${i}`} style={styles.mapRow}>
              <Text style={[styles.mapCol, styles.flex]}>{h || '—'}</Text>
              <Text style={[styles.mapSample, styles.flex]} numberOfLines={1}>
                {sheet.rows.find((r) => r[i])?.[i] ?? ''}
              </Text>
              <View style={styles.flex}>
                <Select label={FIELD_LABEL[mapping[i]]} muted={mapping[i] === 'none'} onPress={() => setPicking(i)} />
              </View>
            </View>
          ))}
        </View>
        <View style={styles.footer}>
          <AppText variant="caption" tone="secondary" style={styles.footerNote}>
            {requiredOk
              ? 'Обязательные поля — название, автор и количество — сопоставлены.'
              : 'Сопоставьте обязательные поля — название, автор и количество.'}
          </AppText>
          <View style={styles.row}>
            <Button label="Назад" variant="secondary" onPress={() => setStep('upload')} />
            <Button label="Далее" variant="dark" disabled={!requiredOk} loading={busy} onPress={() => void toPreview()} />
          </View>
        </View>
      </>
    );
  } else if (step === 'preview' && summary) {
    const rows = summary.rows.filter((r) => filter === 'all' || r.check.kind === filter);
    const columns: Column<CheckedRow>[] = [
      { key: 'line', title: 'Строка', width: 64, render: (r) => <Cell tone="muted" tabular>{r.line}</Cell> },
      { key: 'title', title: 'Название', flex: 1.4, render: (r) => <Cell strong={false} style={styles.medium}>{r.title || '—'}</Cell> },
      {
        key: 'author',
        title: 'Автор',
        flex: 1,
        render: (r) => <Cell tone={r.author ? 'ink' : 'overdue'}>{r.author || '—'}</Cell>,
      },
      {
        key: 'copies',
        title: 'Экз.',
        width: 64,
        render: (r) => (
          <Cell tabular>{r.check.kind === 'exists' && mode === 'increase' ? `+${r.copies}` : Number.isFinite(r.copies) ? r.copies : '—'}</Cell>
        ),
      },
      {
        key: 'check',
        title: 'Проверка',
        width: 200,
        render: (r) => {
          const c = checkChip(r);
          return <StatusChip label={c.label} tone={c.tone} size="sm" />;
        },
      },
    ];
    body = (
      <>
        <View style={styles.counters}>
          <CounterPill label="Все строки" count={summary.total} tone="plain" selected={filter === 'all'} onPress={() => setFilter('all')} />
          <CounterPill label="Будет добавлено" count={summary.toAdd} tone="available" selected={filter === 'new'} onPress={() => setFilter('new')} />
          <CounterPill label="Уже в каталоге" count={summary.existing} tone="neutral" selected={filter === 'exists'} onPress={() => setFilter('exists')} />
          <CounterPill label="С ошибками" count={summary.errors} tone="overdue" selected={filter === 'error'} onPress={() => setFilter('error')} />
        </View>
        {summary.existing > 0 && (
          <View style={styles.dupBar}>
            <Text style={styles.dupText}>
              {summary.existing} {books(summary.existing)} уже есть в каталоге. Что с ними сделать?
            </Text>
            <SegmentedControl
              size="sm"
              stretch={false}
              options={[
                { value: 'skip', label: 'Пропустить' },
                { value: 'increase', label: 'Увеличить количество' },
              ]}
              value={mode}
              onChange={setMode}
            />
          </View>
        )}
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.line}
          minWidth={760}
          rowStyle={(r) => (r.check.kind === 'error' ? styles.errorRow : null)}
        />
        <View style={styles.footer}>
          <AppText variant="caption" tone="secondary" style={styles.footerNote}>
            Будет добавлено {summary.toAdd} {books(summary.toAdd)}
            {mode === 'increase' && summary.existing > 0 ? `, ${summary.existing} пополнят фонд` : ''}.
            {summary.errors > 0
              ? ` ${summary.errors} ${plural(summary.errors, ['строку', 'строки', 'строк'])} с ошибками можно пропустить.`
              : ''}
          </AppText>
          <View style={styles.row}>
            <Button label="Отмена" variant="secondary" onPress={toCatalog} />
            {summary.errors > 0 && <Button label="Скачать ошибки" variant="secondary" onPress={downloadErrors} />}
            <Button
              label={summary.errors > 0 ? 'Пропустить ошибки и импортировать' : 'Импортировать'}
              variant="dark"
              loading={busy}
              disabled={summary.toAdd + (mode === 'increase' ? summary.existing : 0) === 0}
              onPress={() => void run()}
            />
          </View>
        </View>
      </>
    );
  } else if (step === 'result' && result) {
    const total = result.added + result.increased;
    body = (
      <View style={styles.final}>
        <StatusIcon icon="check" tone="available" size={80} />
        <AppText variant="titleLg" align="center">
          Импортировано {total} {books(total)}
        </AppText>
        <AppText tone="secondary" align="center" style={styles.lead}>
          {result.added} {plural(result.added, ['новая книга добавлена', 'новые книги добавлено', 'новых книг добавлено'])}
          {result.increased > 0 ? `, ${result.increased} ${plural(result.increased, ['пополнила', 'пополнили', 'пополнили'])} фонд` : ''}.
          {result.skipped > 0
            ? ` Пропущено ${result.skipped} ${plural(result.skipped, ['строка', 'строки', 'строк'])} с ошибками — их можно скачать, исправить и загрузить отдельно.`
            : ''}
        </AppText>
        <View style={styles.row}>
          <Button label="Перейти в каталог" variant="dark" onPress={toCatalog} />
          {result.skipped > 0 && <Button label="Скачать пропущенные строки" variant="secondary" onPress={downloadErrors} />}
        </View>
      </View>
    );
  } else {
    body = (
      <View style={styles.final}>
        <StatusIcon icon="alert" tone="overdue" size={80} />
        <AppText variant="titleLg" align="center">
          Импорт прерван
        </AppText>
        <AppText tone="secondary" align="center" style={styles.lead}>
          Ничего не добавлено — каталог остался прежним. Можно повторить с тем же файлом.
        </AppText>
        <Button label="Повторить импорт" variant="dark" loading={busy} onPress={() => void run()} style={styles.center} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Panel style={styles.panel}>
        <View style={styles.head}>
          <View style={styles.title}>
            <IconButton icon="back" variant="plain" accessibilityLabel="Назад в каталог" onPress={toCatalog} />
            <TwoToneTitle text="Импорт" muted="из таблицы" variant="titleLg" />
          </View>
          <Steps steps={['Файл', 'Колонки', 'Проверка', 'Готово']} current={STEP_INDEX[step]} />
        </View>
        {body}
      </Panel>

      <BottomSheet visible={picking !== null} onClose={() => setPicking(null)}>
        <MenuGroup>
          {(Object.keys(FIELD_LABEL) as CatalogField[]).map((f) => (
            <MenuItem
              key={f}
              icon={f === 'none' ? 'closeSmall' : 'check'}
              label={FIELD_LABEL[f]}
              current={picking !== null && mapping[picking] === f}
              onPress={() => {
                if (picking === null) return;
                setMapping((m) => m.map((x, i) => (i === picking ? f : x === f && f !== 'none' ? 'none' : x)));
                setPicking(null);
              }}
            />
          ))}
        </MenuGroup>
      </BottomSheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignSelf: 'center' },
  medium: { fontFamily: fonts.medium },
  content: { flexGrow: 1, paddingHorizontal: space[6], paddingBottom: space[6] },
  panel: { flexGrow: 1, gap: space[5], paddingHorizontal: space[6], paddingBottom: space[6] },
  head: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: space[4] },
  title: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  lead: { maxWidth: 420 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4],
    paddingVertical: 14,
    paddingHorizontal: space[4],
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  fileName: { ...typography.body, lineHeight: 20, fontFamily: fonts.semibold, color: colors.ink },
  mapCard: { gap: space[2], paddingVertical: space[2], paddingHorizontal: space[4], borderRadius: radius.xl, backgroundColor: colors.surface },
  mapRow: { flexDirection: 'row', alignItems: 'center', gap: space[4], minHeight: 52, borderBottomWidth: 1, borderBottomColor: colors.surfaceSunken },
  mapHead: { minHeight: 32, borderBottomColor: colors.divider },
  th: { ...typography.micro, color: colors.inkSecondary },
  mapCol: { ...typography.label, fontFamily: fonts.semibold, color: colors.ink },
  mapSample: { ...typography.label, fontFamily: fonts.regular, color: colors.inkSecondary },
  footer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: space[3], marginTop: 'auto' },
  footerNote: { paddingLeft: space[2], flexShrink: 1 },
  counters: { flexDirection: 'row', gap: space[2] },
  dupBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
    paddingVertical: space[3],
    paddingLeft: space[4],
    paddingRight: space[3],
    borderRadius: radius.lg,
    backgroundColor: status.neutral.bg,
  },
  dupText: { ...typography.label, color: status.neutral.fg },
  errorRow: { backgroundColor: ui.errorRowBg },
  final: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[4],
    paddingVertical: 64,
    paddingHorizontal: space[6],
    borderRadius: radius['2xl'],
    backgroundColor: colors.surface,
  },
});
