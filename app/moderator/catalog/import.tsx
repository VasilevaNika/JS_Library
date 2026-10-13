import { StubScreen } from '@/components/StubScreen';

export default function ImportScreen() {
  return (
    <StubScreen
      title="M4 Импорт из таблицы"
      links={[
        { label: 'Журнал', href: '/moderator/journal' },
        { label: 'Выдача и сверка', href: '/moderator/issue' },
        { label: 'Каталог', href: '/moderator/catalog' },
      ]}
    />
  );
}
