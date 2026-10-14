// M1 · Журнал броней. Состояния: таблица, открыта запись, фильтр без результатов, броней нет,
// первый запуск — каталог пуст (+ загрузка, ошибка).
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  AppText,
  Avatar,
  BookCover,
  Button,
  Cell,
  type Column,
  DataTable,
  EmptyState,
  FilterChip,
  IconButton,
  LoadError,
  LoadingBlock,
  Panel,
  StatusChip,
  StatusIcon,
  StatusTimeline,
  ToolbarSearch,
  TwoToneTitle,
} from '@/components';
import {
  countBooks,
  getJournal,
  getStatusHistory,
  initials,
  JOURNAL_FILTERS,
  type BookingWithBookAndUser,
  type JournalFilter,
  type StatusEvent,
} from '@/db';
import { useQuery } from '@/hooks/useQuery';
import { EVENT_TONE, JOURNAL_STATUS } from '@/lib/bookingStatus';
import { dayMonth, numericDay, numericDayTime, time } from '@/lib/format';
import { colors, fonts, radius, space, typography, ui } from '@/theme/tokens';

const FILTER_META: Record<JournalFilter, { label: string; tone: 'all' | 'busy' | 'overdue' | 'neutral' }> = {
  all: { label: 'Все', tone: 'all' },
  reserved: { label: 'Забронировано', tone: 'busy' },
  issued: { label: 'Выдано', tone: 'busy' },
  overdue: { label: 'Просрочено', tone: 'overdue' },
  awaiting_check: { label: 'Ожидает сверки', tone: 'neutral' },
  expired: { label: 'Истекло', tone: 'neutral' },
  closed: { label: 'Закрыто', tone: 'neutral' },
};

type Row = BookingWithBookAndUser;

export default function JournalScreen() {
  const router = useRouter();
  const [filters, setFilters] = useState<JournalFilter[]>(['all']);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<number | null>(null);

  const q = useQuery(async () => {
    const [page, books] = await Promise.all([getJournal(filters, query), countBooks()]);
    return { page, books };
  }, [filters.join(','), query]);

  const history = useQuery(
    async () => (selected === null ? [] : getStatusHistory(selected)),
    [selected],
  );

  const toggle = (f: JournalFilter) => {
    if (f === 'all') return setFilters(['all']);
    setFilters((prev) => {
      const rest = prev.filter((x) => x !== 'all');
      const next = rest.includes(f) ? rest.filter((x) => x !== f) : [...rest, f];
      return next.length ? next : ['all'];
    });
  };

  const toIssue = (code?: string) => router.replace(code ? { pathname: '/moderator/issue', params: { code } } : '/moderator/issue');

  const page = q.data?.page;
  const rows = page?.rows ?? [];
  const record = rows.find((r) => r.id === selected) ?? null;

  const columns: Column<Row>[] = [
    {
      key: 'student',
      title: 'Студент',
      flex: 1.3,
      render: (r) => (
        <View style={styles.student}>
          <Avatar initials={initials(r.user.fullName)} color={r.user.avatarColor} />
          <Cell strong style={styles.nowrap}>
            {r.user.fullName}
          </Cell>
          <Text style={styles.group}>{r.user.groupName}</Text>
        </View>
      ),
    },
    { key: 'book', title: 'Книга', flex: 1.6, render: (r) => <Cell>{r.book.title}</Cell> },
    {
      key: 'booked',
      title: 'Бронь',
      width: 64,
      render: (r) => (
        <Cell tone="neutral" tabular>
          {r.reservedAt ? numericDay(r.reservedAt) : '—'}
        </Cell>
      ),
    },
    {
      key: 'issued',
      title: 'Выдана',
      width: 64,
      render: (r) => (
        <Cell tone="neutral" tabular>
          {r.issuedAt ? numericDay(r.issuedAt) : '—'}
        </Cell>
      ),
    },
    {
      key: 'due',
      title: 'Срок возврата ↓',
      width: 120,
      render: (r) => {
        if (r.status === 'reserved' || r.status === 'expired' || r.status === 'cancelled') {
          return <Cell tabular>{r.pickupUntil ? `до ${numericDayTime(r.pickupUntil)}` : '—'}</Cell>;
        }
        const overdue = r.status === 'overdue';
        return (
          <Cell tabular tone={overdue ? 'overdue' : 'ink'} strong={overdue}>
            {r.dueAt ? numericDay(r.dueAt) : '—'}
          </Cell>
        );
      },
    },
    {
      key: 'status',
      title: 'Статус',
      width: 136,
      render: (r) => <StatusChip label={JOURNAL_STATUS[r.status].label} tone={JOURNAL_STATUS[r.status].tone} size="sm" />,
    },
    {
      key: 'action',
      title: '',
      width: 96,
      align: 'right',
      render: (r) =>
        r.status === 'overdue' || r.status === 'awaiting_check' ? (
          <Button label="Сверить" variant="tertiary" size="sm" onPress={() => toIssue()} />
        ) : r.status === 'reserved' ? (
          <Button label="Выдать" variant="tertiary" size="sm" onPress={() => toIssue(r.code)} />
        ) : null,
    },
  ];

  let body;
  if (q.status === 'loading') {
    body = (
      <LoadingBlock />
    );
  } else if (q.status === 'error' && !q.data) {
    body = (
      <LoadError container="card" title="Не удалось загрузить журнал" onRetry={() => void q.reload({ showLoading: true })} />
    );
  } else if (q.data && q.data.books === 0) {
    body = (
      <EmptyState
        container="card"
        visual={<StatusIcon icon="bookOpen" tone="sunken" />}
        title="Каталог пуст"
        text="Загрузите фонд из таблицы, чтобы студенты могли искать и бронировать книги."
        actions={
          <Button
            label="Импортировать из таблицы"
            variant="dark"
            onPress={() => router.replace('/moderator/catalog/import')}
            style={styles.center}
          />
        }
      />
    );
  } else if (page && page.counts.all === 0 && !query) {
    body = (
      <EmptyState
        container="card"
        visual={<StatusIcon icon="bookOpen" tone="sunken" />}
        title="Броней пока нет"
        text="Они появятся здесь, когда студенты начнут бронировать книги."
      />
    );
  } else if (rows.length === 0) {
    const single = filters.length === 1 && filters[0] !== 'all' ? FILTER_META[filters[0]].label : null;
    body = (
      <EmptyState
        container="card"
        visual={<StatusIcon icon="bookOpen" tone="sunken" />}
        title={single ? `Нет записей со статусом «${single}»` : 'Записей не найдено'}
        text={filters[0] === 'expired' ? 'Все брони за последнее время забрали или отменили вовремя.' : undefined}
        actions={
          <Button
            label="Сбросить фильтр"
            variant="dark"
            onPress={() => {
              setFilters(['all']);
              setQuery('');
            }}
            style={styles.center}
          />
        }
      />
    );
  } else {
    body = (
      <>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          onRowPress={(r) => setSelected(r.id === selected ? null : r.id)}
          rowStyle={(r) => (r.id === selected ? styles.selectedRow : null)}
        />
        <View style={styles.footer}>
          <AppText variant="micro" tone="secondary" style={styles.regular}>
            Показано {rows.length} из {page?.counts.all ?? rows.length}
          </AppText>
          <AppText variant="micro" tone="secondary" style={styles.regular}>
            Сначала самые срочные
          </AppText>
        </View>
      </>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.columns}>
        <Panel
          title="Журнал"
          muted="броней"
          style={styles.main}
          actions={
            <>
              <ToolbarSearch
                value={query}
                onChangeText={setQuery}
                placeholder="Студент, книга, ISBN, код"
                accessibilityLabel="Поиск по журналу"
              />
              {/* Доп. фильтры, сортировка и экспорт — экранов в макетах нет, кнопки неактивны (Q8). */}
              <IconButton icon="sliders" variant="plain" accessibilityLabel="Дополнительные фильтры" />
              <IconButton icon="sort" variant="plain" accessibilityLabel="Сортировка" />
              <IconButton icon="download" variant="plain" accessibilityLabel="Экспорт журнала" />
              <Button label="Подтвердить выдачу" variant="primary" size="md" icon="check" strong onPress={() => toIssue()} />
            </>
          }
        >
          <View style={styles.filters} accessibilityLabel="Фильтр по статусу">
            {JOURNAL_FILTERS.map((f) => (
              <FilterChip
                key={f}
                label={FILTER_META[f].label}
                count={page?.counts[f] ?? 0}
                tone={FILTER_META[f].tone}
                selected={filters.includes(f)}
                onPress={() => toggle(f)}
              />
            ))}
          </View>
          {body}
        </Panel>

        {record && (
          <RecordPanel
            record={record}
            events={history.data ?? []}
            onClose={() => setSelected(null)}
            onCheck={() => toIssue()}
            onIssue={() => toIssue(record.code)}
          />
        )}
      </View>
    </ScrollView>
  );
}

function RecordPanel({
  record: r,
  events,
  onClose,
  onCheck,
  onIssue,
}: {
  record: Row;
  events: StatusEvent[];
  onClose: () => void;
  onCheck: () => void;
  onIssue: () => void;
}) {
  const meta =
    r.status === 'reserved' && r.pickupUntil
      ? `Бронь до ${dayMonth(r.pickupUntil)}, ${time(r.pickupUntil)}`
      : r.dueAt
        ? `Срок возврата ${dayMonth(r.dueAt)}`
        : '';
  const actor = (e: StatusEvent) =>
    e.actorType === 'system' ? 'система' : e.actorType === 'student' ? 'студент' : (e.actorName ?? 'модератор');
  const title = (e: StatusEvent) =>
    e.status === 'issued' && e.dueAt ? `Выдана, вернуть до ${dayMonth(e.dueAt)}` : JOURNAL_STATUS[e.status].label;

  return (
    <Panel style={styles.aside}>
      <View style={styles.asideHead}>
        <TwoToneTitle text="Запись" muted={`№ ${r.code}`} variant="title" style={styles.indent} />
        <IconButton icon="close" variant="plain" accessibilityLabel="Закрыть карточку записи" onPress={onClose} />
      </View>
      <View style={styles.recordCard}>
        <View style={styles.recordRow}>
          <Avatar initials={initials(r.user.fullName)} color={r.user.avatarColor} size={40} />
          <View style={styles.flexShrink}>
            <Text style={styles.recordName}>{r.user.fullName}</Text>
            <AppText variant="caption" tone="secondary">
              {[r.user.groupName, r.user.email].filter(Boolean).join(' · ')}
            </AppText>
          </View>
        </View>
        <View style={[styles.recordRow, styles.recordBook]}>
          <BookCover color={r.book.coverColor} uri={r.book.coverUri} width={32} height={46} lines={1} />
          <View style={styles.flexShrink}>
            <Text style={styles.recordBookTitle} numberOfLines={1}>
              {r.book.title}
            </Text>
            <AppText variant="caption" tone="secondary">
              {meta}
            </AppText>
          </View>
          <StatusChip label={JOURNAL_STATUS[r.status].label} tone={JOURNAL_STATUS[r.status].tone} size="sm" />
        </View>
      </View>
      <View style={styles.history}>
        <AppText variant="caption" tone="secondary" style={styles.historyLabel}>
          История статусов
        </AppText>
        <StatusTimeline
          events={events.map((e) => ({
            key: e.id,
            title: title(e),
            caption: `${dayMonth(e.at)}, ${time(e.at)} · ${actor(e)}`,
            tone: EVENT_TONE[e.status],
          }))}
        />
      </View>
      {(r.status === 'overdue' || r.status === 'awaiting_check') && (
        <Button label="Сверить с полкой" variant="dark" block onPress={onCheck} />
      )}
      {r.status === 'reserved' && <Button label="Выдать" variant="dark" block onPress={onIssue} />}
      {r.reminderSentAt ? (
        <AppText variant="caption" tone="secondary" align="center">
          Студенту ушло напоминание {dayMonth(r.reminderSentAt)}
        </AppText>
      ) : null}
    </Panel>
  );
}

const styles = StyleSheet.create({
  flexShrink: { flex: 1, minWidth: 0 },
  center: { alignSelf: 'center' },
  regular: { fontFamily: fonts.regular },
  content: { paddingHorizontal: space[6], paddingBottom: space[6] },
  columns: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: space[4] },
  main: { flexGrow: 999, flexShrink: 1, flexBasis: 640, minWidth: 0, borderRadius: radius.sheet },
  aside: { flexGrow: 1, flexShrink: 1, flexBasis: 340, maxWidth: 380 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  student: { flexDirection: 'row', alignItems: 'center', gap: space[2.5] },
  nowrap: { flexShrink: 0 },
  group: { ...typography.microRegular, color: colors.inkMuted },
  selectedRow: { backgroundColor: ui.selectedRowBg },
  footer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space[2] },
  asideHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  indent: { marginLeft: space[1] },
  recordCard: { gap: space[3], paddingVertical: space[3.5], paddingHorizontal: space[4], borderRadius: radius.xl, backgroundColor: colors.surface },
  recordRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  recordBook: { paddingTop: space[3], borderTopWidth: 1, borderTopColor: colors.surfaceSunken },
  recordName: { ...typography.body, lineHeight: 20, fontFamily: fonts.semibold, color: colors.ink },
  recordBookTitle: { ...typography.label, fontFamily: fonts.semibold, color: colors.ink },
  history: { gap: space[1] },
  historyLabel: { fontFamily: fonts.medium, paddingHorizontal: space[2], paddingBottom: space[2] },
});
