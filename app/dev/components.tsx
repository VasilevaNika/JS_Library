// Демо-экран дизайн-системы (шаг 8): все компоненты и их варианты на одном экране.
import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppText,
  Avatar,
  Banner,
  BookCover,
  BookingCard,
  BookRow,
  BookSummaryCard,
  BookTile,
  BottomSheet,
  Bone,
  Button,
  CheckboxRow,
  Cell,
  CounterPill,
  DataTable,
  DateButton,
  Dialog,
  Dropzone,
  EmptyState,
  FilterChip,
  Glass,
  Header,
  Icon,
  IconButton,
  InfoList,
  MenuGroup,
  MenuItem,
  ModeratorTopBar,
  Notice,
  Panel,
  ProgressBar,
  QRCard,
  ReconciliationCard,
  ScanViewfinder,
  ScreenBackground,
  SearchField,
  SegmentedControl,
  Select,
  ShelfIllustration,
  SkeletonBookingCard,
  SkeletonPanel,
  SkeletonRow,
  SkeletonStats,
  StatBlock,
  StatusChip,
  StatusIcon,
  StatusTimeline,
  Stepper,
  Steps,
  Switch,
  TabBar,
  TextField,
  TextLink,
  Toast,
  TwoToneTitle,
  type IconName,
} from '@/components';
import { colors, covers, fonts, space, type CoverColor } from '@/theme/tokens';

const ICONS: IconName[] = [
  'search', 'bookmark', 'bookmarkPlus', 'user', 'menu', 'back', 'chevron', 'chevronDown', 'close', 'closeSmall',
  'check', 'clock', 'calendar', 'barcode', 'sliders', 'sort', 'download', 'upload', 'logout', 'eye', 'edit',
  'bookOpen', 'wifiOff', 'message', 'mail', 'refresh', 'camera', 'cameraOff', 'plus', 'fileUpload', 'fileSheet',
  'alert', 'spinner',
];

const COVER_COLORS = Object.keys(covers) as CoverColor[];

const noop = () => {};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="title">{title}</AppText>
      {children}
    </View>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

export default function ComponentsDemo() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [dup, setDup] = useState<'skip' | 'increase'>('increase');
  const [on, setOn] = useState(true);
  const [checked, setChecked] = useState(true);
  const [copies, setCopies] = useState(5);
  const [query, setQuery] = useState('алгоритмы');
  const [email, setEmail] = useState('anna.smirnova@mail.ru');
  const [dialog, setDialog] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [filters, setFilters] = useState<string[]>(['all']);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content}>
          <Header variant="back" title="Компоненты" backLabel="Назад" onBack={() => router.back()} />

          <Section title="Текст">
            <TwoToneTitle text="Какая книга" muted="вам нужна?" />
            <TwoToneTitle text="Алгоритмы. Построение и анализ" variant="titleLg" />
            <TwoToneTitle text="Подтвердить выдачу" variant="title" />
            <TwoToneTitle text="5 книг" muted="Найдено" mutedFirst variant="headline" />
            <AppText>body — Забрать можно в любое время в часы работы библиотеки.</AppText>
            <AppText variant="bodyStrong">bodyStrong — Грокаем алгоритмы</AppText>
            <AppText variant="label" tabular>label — 18 сентября, 20:00</AppText>
            <AppText variant="caption" tone="secondary">caption — Заберите до 18 сентября, 20:00</AppText>
            <AppText variant="micro">micro — В наличии</AppText>
          </Section>

          <Section title="Иконки">
            <Row>
              {ICONS.map((n) => (
                <View key={n} style={styles.iconCell}>
                  <Icon name={n} size={24} />
                  <AppText variant="micro" tone="secondary">{n}</AppText>
                </View>
              ))}
            </Row>
          </Section>

          <Section title="StatusChip">
            <Row>
              <StatusChip label="В наличии" tone="available" />
              <StatusChip label="Занята" tone="busy" />
              <StatusChip label="Ждёт вас" tone="busy" />
              <StatusChip label="Просрочено" tone="overdue" />
              <StatusChip label="Ожидает сверки" tone="neutral" />
            </Row>
            <Row>
              <StatusChip label="В наличии" tone="available" size="sm" />
              <StatusChip label="Выдана" tone="busy" size="sm" />
              <StatusChip label="Закрыта" tone="neutral" size="sm" />
            </Row>
            <Row>
              <StatusChip label="В наличии" tone="available" size="lg" />
              <StatusChip label="Ваша бронь" tone="busy" size="lg" />
              <StatusChip label="Просрочено" tone="overdue" size="lg" />
            </Row>
          </Section>

          <Section title="StatBlock">
            <StatBlock items={[{ label: 'На полке', value: 2, tone: 'available' }, { label: 'Выдано', value: 3 }, { label: 'Очередь', value: 0 }]} />
            <StatBlock
              secondFlex={1.4}
              items={[{ label: 'Активные', value: 4 }, { label: 'Просрочено', value: 1, tone: 'overdue' }, { label: 'Завершённые', value: 4 }]}
            />
          </Section>

          <Section title="Button">
            <Button label="Забронировать" variant="primary" icon="bookmarkPlus" block />
            <Button label="Бронируем…" variant="primary" loading block />
            <Button label="Забронировать" variant="primary" disabled block />
            <Button label="Я вернул книгу" variant="dark" block />
            <Button label="Встать в очередь" variant="secondary" icon="clock" block />
            <Button label="Отменить бронь" variant="danger" block />
            <Row>
              <Button label="Отменить" variant="tertiary" size="md" />
              <Button label="Выйти" variant="secondary" size="md" />
              <Button label="Сверить" variant="tertiary" size="sm" />
              <Button label="Повторить" variant="light" size="sm" />
            </Row>
            <Row>
              <Button label="На полке — закрыть" variant="positive" size="sm" />
              <Button label="Нет на полке" variant="negative" size="sm" />
              <Button label="Убрать из каталога" variant="danger" size="md" disabled />
            </Row>
            <Row>
              <IconButton icon="menu" accessibilityLabel="Меню" color={colors.inkSecondary} />
              <IconButton icon="back" accessibilityLabel="Назад" />
              <IconButton icon="close" accessibilityLabel="Закрыть" variant="plain" />
              <IconButton icon="sliders" accessibilityLabel="Фильтры" variant="plain" />
              <TextLink label="Забыли пароль?" onPress={noop} />
            </Row>
          </Section>

          <Section title="Поля">
            <SearchField value={query} onChangeText={setQuery} onClear={() => setQuery('')} />
            <SearchField value="" onChangeText={noop} />
            <Glass style={styles.form}>
              <SegmentedControl
                options={[{ value: 'login', label: 'Вход' }, { value: 'register', label: 'Регистрация' }]}
                value={mode}
                onChange={setMode}
              />
              <TextField label="Почта" value={email} onChangeText={setEmail} placeholder="name@mail.ru" keyboardType="email-address" />
              <TextField label="Почта" value="anna.smirnova.mail.ru" error="Проверьте адрес — в нём нет @" />
              <TextField
                label="Почта"
                value="anna.smirnova@mail.ru"
                error={
                  <>
                    <AppText variant="caption" tone="overdue">Этот адрес уже зарегистрирован.</AppText>
                    <TextLink label="Войти с ним" />
                  </>
                }
              />
              <TextField label="Telegram" hint="для напоминаний о сроке" prefix="@" value="" placeholder="username" />
              <TextField
                label="Пароль"
                labelAction={<TextLink label="Забыли пароль?" />}
                value="password12"
                secure
                placeholder="Не короче 8 символов"
              />
            </Glass>
            <TextField label="ISBN" size="md" value="978-5-8459-2016-4" state="warning" tabular />
            <TextField label="Автор *" size="md" value="" placeholder="Фамилия И. О." error="Укажите автора — по нему студенты ищут книгу." />
            <TextField label="Комментарий для журнала" size="md" value="" multiline placeholder="Например: проверил стеллаж 3 и соседние полки" />
            <SegmentedControl
              size="sm"
              stretch={false}
              options={[{ value: 'skip', label: 'Пропустить' }, { value: 'increase', label: 'Увеличить количество' }]}
              value={dup}
              onChange={setDup}
            />
            <Row>
              <Switch value={on} onChange={setOn} label="Напоминать о сроке" />
              <Stepper value={copies} onChange={setCopies} />
              <DateButton label="30.09.2026" />
            </Row>
            <CheckboxRow checked={checked} onChange={setChecked} accessibilityLabel="Алгоритмы. Построение и анализ">
              <BookCover color="teal" width={28} height={40} lines={0} />
              <View style={styles.flex}>
                <AppText variant="label" style={styles.semibold}>Алгоритмы. Построение и анализ</AppText>
                <AppText variant="caption" tone="secondary">Бронь до 18 сентября, 20:00</AppText>
              </View>
            </CheckboxRow>
            <Row>
              <View style={styles.select}><Select label="Название" /></View>
              <View style={styles.select}><Select label="Не импортировать" muted /></View>
            </Row>
          </Section>

          <Section title="Обложки">
            <Row>
              {COVER_COLORS.map((c) => (
                <BookCover key={c} color={c} />
              ))}
            </Row>
            <Row>
              <BookCover color="teal" size="md" />
              <BookCover color="mustard" width={96} height={140} raised />
              <BookCover
                color="teal"
                size="lg"
                height={216}
                title="Алгоритмы"
                subtitle="Построение и анализ"
                authors="Кормен · Лейзерсон · Ривест · Штайн"
                accessibilityLabel="Обложка книги «Алгоритмы. Построение и анализ»"
              />
            </Row>
          </Section>

          <Section title="Книги и брони">
            <BookRow book={{ title: 'Алгоритмы. Построение и анализ', color: 'teal' }} meta="Т. Кормен и др." chip={{ label: 'В наличии', tone: 'available' }} />
            <BookRow
              book={{ title: 'Алгоритмы. Построение и анализ', color: 'teal' }}
              meta="Т. Кормен и др. · только что забронировали"
              chip={{ label: 'Занята', tone: 'busy' }}
              highlighted
            />
            <View style={styles.tiles}>
              <BookTile book={{ title: 'Механика', color: 'ochre' }} chip={{ label: 'В наличии', tone: 'available' }} />
              <BookTile book={{ title: 'Компьютерные сети', color: 'sky' }} chip={{ label: 'В наличии', tone: 'available' }} />
              <BookTile book={{ title: 'Математический анализ', color: 'green' }} chip={{ label: 'В наличии', tone: 'available' }} />
            </View>
            <BookingCard
              book={{ title: 'Алгоритмы. Построение и анализ', color: 'teal' }}
              meta="Заберите до 18 сентября, 20:00"
              chip={{ label: 'Ждёт вас', tone: 'busy' }}
              action={<Button label="Отменить" variant="tertiary" size="md" />}
            />
            <BookingCard
              book={{ title: 'Грокаем алгоритмы', color: 'mustard' }}
              meta="Срок возврата прошёл 12 сентября"
              metaTone="overdue"
              chip={{ label: 'Просрочено', tone: 'overdue' }}
              overdue
              action={<Button label="Я вернул книгу" variant="tertiary" size="md" />}
            />
            <BookingCard
              book={{ title: 'Механика', color: 'ochre' }}
              meta="Вы отметили возврат 15 сентября. Библиотека проверит полку"
              chip={{ label: 'Ожидает сверки', tone: 'neutral' }}
            />
            <BookSummaryCard book={{ title: 'Алгоритмы. Построение и анализ', color: 'teal' }} author="Т. Кормен и др." chip={{ label: 'Ждёт вас', tone: 'busy' }} onPress={noop} />
            <BookSummaryCard book={{ title: 'Алгоритмы. Построение и анализ', color: 'teal' }} author="Т. Кормен и др." plain />
            <InfoList
              items={[
                { label: 'Авторы', value: 'Кормен, Лейзерсон и др.', icon: 'user' },
                { label: 'Год', value: '2019', icon: 'calendar' },
                { label: 'ISBN', value: '978-5-8459-2016-4', icon: 'barcode' },
              ]}
            />
            <InfoList
              items={[
                { label: 'Забрать до', value: '18 сентября, 20:00', note: '(48 ч)' },
                { label: 'Где', value: 'Абонемент, 2 этаж' },
                { label: 'Правила бронирования', value: '48 ч на получение', onPress: noop },
              ]}
            />
            <QRCard code="7KQ4MX" />
            <QRCard code="7KQ4MX" layout="center" />
          </Section>

          <Section title="Обратная связь">
            <Notice tone="available" text="Ваша бронь. Книга ждёт вас до 18 сентября, 20:00" />
            <Notice tone="busy" text="Книгу только что забронировали. Можно встать в очередь." />
            <Notice
              tone="neutral"
              text="У вас уже 3 активные брони. Заберите или отмените одну из них."
              link={{ label: 'Открыть «Мои брони»', onPress: noop }}
            />
            <Notice tone="overdue" text="Бронь с кодом 9ZZ1AB не найдена. Проверьте код или найдите по имени студента." large />
            <Notice tone="neutral" cover="teal" text="Чтобы забронировать «Алгоритмы. Построение и анализ», войдите. Бронь оформится сразу." />
            <Notice
              tone="busy"
              text="Книга с этим ISBN уже есть в каталоге: «Алгоритмы. Построение и анализ», 5 экз."
              action={{ label: 'Открыть её', onPress: noop }}
            />
            <Notice
              tone="neutral"
              large
              text="Бронь 4PL8RT истекла 8 сентября. Книга «Компьютерные сети» сейчас в наличии."
              action={{ label: 'Выдать без брони', onPress: noop, placement: 'below' }}
            />
            <Banner text="Нет подключения. Показаны данные на 18:40" actionLabel="Повторить" onAction={noop} />
            <View style={styles.toastBox}>
              <Toast text="Не удалось создать бронь. Книга по-прежнему в наличии — попробуйте ещё раз." actionLabel="Повторить" bottom={16} />
            </View>
            <Toast
              inline
              success
              text="Выдано: «Алгоритмы. Построение и анализ» → Анна Смирнова, вернуть до 30 сентября. Поле очищено для следующего."
            />
            <Row>
              <Button label="Открыть диалог" variant="secondary" size="md" onPress={() => setDialog(true)} />
              <Button label="Открыть шторку" variant="secondary" size="md" onPress={() => setSheet(true)} />
            </Row>
          </Section>

          <Section title="Навигация">
            <Header variant="brand" action={{ icon: 'menu', label: 'Меню', onPress: noop }} />
            <Header variant="brand" action={{ icon: 'close', label: 'Закрыть', onPress: noop }} />
            <Header variant="book" backLabel="Назад к результатам" onBack={noop} />
            <Header variant="success" badge="Бронь оформлена" closeLabel="Закрыть" onClose={noop} />
            <View style={styles.tabBox}>
              <TabBar
                bottom={8}
                tabs={[
                  { key: 's', icon: 'search', label: 'Поиск', active: true, onPress: noop },
                  { key: 'b', icon: 'bookmark', label: 'Мои брони', active: false, onPress: noop, badge: 4 },
                  { key: 'p', icon: 'user', label: 'Профиль', active: false, onPress: noop },
                ]}
              />
            </View>
            <MenuGroup>
              <MenuItem icon="search" label="Поиск книг" current />
              <MenuItem icon="bookmark" label="Мои брони" trailing={<StatusChip label="1 просрочено" tone="overdue" size="sm" />} />
              <MenuItem icon="clock" label="Часы работы и адрес" caption="Абонемент, 2 этаж · пн–пт 10:00–20:00" disabled />
            </MenuGroup>
            <ScrollView horizontal>
              <View style={styles.wide}>
                <ModeratorTopBar
                  current="journal"
                  onNavigate={noop}
                  date="Среда, 16 сентября"
                  moderatorName="Ирина Максимова"
                  moderatorInitials="ИМ"
                  onLogout={noop}
                />
              </View>
            </ScrollView>
            <Steps steps={['Файл', 'Колонки', 'Проверка', 'Готово']} current={2} />
          </Section>

          <Section title="Загрузка и пустые экраны">
            <SkeletonStats />
            <SkeletonPanel>
              <Bone width="36%" height={14} style={styles.indent} />
              <SkeletonRow />
              <SkeletonRow titleWidth="62%" />
            </SkeletonPanel>
            <SkeletonBookingCard />
            <EmptyState
              visual={<StatusIcon icon="bookmark" tone="white" />}
              title="Войдите, чтобы видеть свои брони"
              text="Брони, очередь и сроки возврата — в одном списке."
              actions={<Button label="Войти" variant="dark" block />}
            />
            <EmptyState
              visual={<ShelfIllustration variant="noBookings" label="Почти пустая полка" />}
              title="У вас пока нет броней"
              text="Найдите книгу и забронируйте её — она будет ждать вас 48 часов."
              actions={<Button label="Найти книгу" variant="dark" style={styles.center} />}
            />
            <ShelfIllustration variant="empty" label="Пустая полка" />
            <Row>
              <ShelfIllustration variant="notFound" label="Полка с пустым местом" />
              <StatusIcon icon="refresh" tone="busy" />
              <StatusIcon icon="check" tone="available" size={64} />
              <StatusIcon icon="alert" tone="overdue" size={80} />
              <StatusIcon icon="bookOpen" tone="sunken" />
              <StatusIcon icon="fileUpload" tone="available" shape="rounded" />
            </Row>
            <EmptyState
              container="card"
              visual={<StatusIcon icon="bookOpen" tone="sunken" />}
              title="Нет записей со статусом «Истекло»"
              text="Все брони за последнее время забрали или отменили вовремя."
              actions={<Button label="Сбросить фильтр" variant="dark" style={styles.center} />}
            />
          </Section>

          <Section title="Модератор">
            <Panel title="Журнал" muted="броней" actions={<Button label="Подтвердить выдачу" variant="primary" size="md" icon="check" strong />}>
              <Row>
                {[
                  { key: 'all', label: 'Все', count: 128, tone: 'all' as const },
                  { key: 'reserved', label: 'Забронировано', count: 3, tone: 'busy' as const },
                  { key: 'overdue', label: 'Просрочено', count: 3, tone: 'overdue' as const },
                  { key: 'expired', label: 'Истекло', count: 0, tone: 'neutral' as const },
                ].map((f) => (
                  <FilterChip
                    key={f.key}
                    label={f.label}
                    count={f.count}
                    tone={f.tone}
                    selected={filters.includes(f.key)}
                    onPress={() => setFilters((p) => (p.includes(f.key) ? p.filter((x) => x !== f.key) : [...p, f.key]))}
                  />
                ))}
              </Row>
              <DataTable
                rows={[
                  { id: 1, name: 'Анна Смирнова', group: 'ПМ-21', book: 'Грокаем алгоритмы', due: '12.09', overdue: true },
                  { id: 2, name: 'Мария Лебедева', group: 'ФИ-23', book: 'Механика', due: '15.09', overdue: false },
                ]}
                rowKey={(r) => r.id}
                minWidth={720}
                columns={[
                  {
                    key: 'student',
                    title: 'Студент',
                    flex: 1.4,
                    render: (r) => (
                      <View style={styles.cellRow}>
                        <Avatar initials={r.name.split(' ').map((p) => p[0]).join('')} color={r.overdue ? 'teal' : 'sky'} />
                        <Cell strong>{r.name}</Cell>
                        <Cell tone="muted">{r.group}</Cell>
                      </View>
                    ),
                  },
                  { key: 'book', title: 'Книга', flex: 1.6, render: (r) => <Cell>{r.book}</Cell> },
                  { key: 'due', title: 'Срок возврата ↓', width: 120, render: (r) => <Cell tabular tone={r.overdue ? 'overdue' : 'ink'} strong={r.overdue}>{r.due}</Cell> },
                  {
                    key: 'status',
                    title: 'Статус',
                    width: 136,
                    render: (r) => <StatusChip size="sm" label={r.overdue ? 'Просрочено' : 'Ожидает сверки'} tone={r.overdue ? 'overdue' : 'neutral'} />,
                  },
                  { key: 'act', title: '', width: 96, align: 'right', render: () => <Button label="Сверить" variant="tertiary" size="sm" /> },
                ]}
              />
            </Panel>
            <View style={styles.counters}>
              <CounterPill label="Все строки" count={352} tone="plain" selected />
              <CounterPill label="Будет добавлено" count={312} tone="available" />
              <CounterPill label="Уже в каталоге" count={28} tone="neutral" />
              <CounterPill label="С ошибками" count={12} tone="overdue" />
            </View>
            <Row>
              <Avatar initials="АС" color="teal" size={28} />
              <Avatar initials="АС" color="teal" size={40} />
              <Avatar initials="АС" color="teal" size={48} />
              <Avatar initials="АС" color="teal" size={64} />
            </Row>
            <ScanViewfinder />
            <ScanViewfinder noCamera />
            <ProgressBar value={12 / 18} />
            <ReconciliationCard
              title="Механика"
              who="Мария Лебедева · отметила возврат 15.09"
              chip={{ label: 'Ожидает сверки', tone: 'neutral' }}
              onClose={noop}
              onMissing={noop}
              onPostpone={noop}
            />
            <ReconciliationCard
              title="Курс дифференциального и интегрального исчисления. Т. 1"
              who="Никита Павлов · срок 13.09"
              chip={{ label: 'Просрочено', tone: 'overdue' }}
              overdue
              onClose={noop}
              onMissing={noop}
              onPostpone={noop}
            />
            <StatusTimeline
              events={[
                { key: 1, title: 'Забронирована', caption: '29 августа, 14:02 · студент', tone: 'busy' },
                { key: 2, title: 'Выдана, вернуть до 12 сентября', caption: '29 августа, 17:40 · Ирина Максимова', tone: 'busy' },
                { key: 3, title: 'Просрочено', caption: '13 сентября, 00:00 · система', tone: 'overdue' },
              ]}
            />
            <View style={styles.dropBox}>
              <Dropzone>
                <StatusIcon icon="fileUpload" tone="available" shape="rounded" />
                <AppText variant="title">Перетащите таблицу сюда</AppText>
                <Row>
                  <Button label="Выбрать файл" variant="dark" />
                  <Button label="Скачать шаблон таблицы" variant="secondary" />
                </Row>
              </Dropzone>
            </View>
          </Section>
        </ScrollView>

        <Dialog
          visible={dialog}
          title="Отменить бронь на «Алгоритмы. Построение и анализ»?"
          text="Книга сразу станет доступна другим."
          cancelLabel="Оставить"
          confirmLabel="Отменить бронь"
          onCancel={() => setDialog(false)}
          onConfirm={() => setDialog(false)}
        />
        <BottomSheet visible={sheet} onClose={() => setSheet(false)}>
          <View style={styles.sheetHead}>
            <StatusIcon icon="clock" tone="available" size={56} />
            <TwoToneTitle text="Вы 2-й" muted="в очереди" variant="title" />
          </View>
          <BookSummaryCard book={{ title: 'Алгоритмы. Построение и анализ', color: 'teal' }} author="Т. Кормен и др." plain />
          <AppText tone="neutral">
            Когда книга освободится, мы напишем на почту и в Telegram. У вас будет 24 часа, чтобы её забрать.
          </AppText>
          <Row>
            <Button label="Мои брони" variant="secondary" style={styles.flex} onPress={() => setSheet(false)} />
            <Button label="Понятно" variant="dark" style={styles.flex12} onPress={() => setSheet(false)} />
          </Row>
        </BottomSheet>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flex12: { flex: 1.2 },
  center: { alignSelf: 'center' },
  semibold: { fontFamily: fonts.semibold },
  content: { padding: space[4], gap: space[6], paddingBottom: 96 },
  section: { gap: space[3] },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space[2] },
  iconCell: { width: 72, alignItems: 'center', gap: space[1] },
  form: { gap: space[4], padding: space[4] },
  select: { width: 180 },
  tiles: { flexDirection: 'row', gap: space[2] },
  toastBox: { height: 96 },
  tabBox: { height: 96 },
  wide: { width: 1100 },
  indent: { marginLeft: space[2] },
  counters: { flexDirection: 'row', gap: space[2] },
  cellRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dropBox: { height: 300 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: space[4] },
});
