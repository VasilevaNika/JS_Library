import { StubScreen } from '@/components/StubScreen';

export default function BookFormScreen() {
  return (
    <StubScreen
      title="M5 Новая книга / Правка книги"
      links={[
        { label: 'Журнал', href: '/moderator/journal' },
        { label: 'Выдача и сверка', href: '/moderator/issue' },
        { label: 'Каталог', href: '/moderator/catalog' },
      ]}
    />
  );
}
