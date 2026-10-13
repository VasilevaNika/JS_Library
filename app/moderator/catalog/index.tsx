import { StubScreen } from '@/components/StubScreen';

export default function CatalogScreen() {
  return (
    <StubScreen
      title="M3 Каталог"
      links={[
        { label: 'Журнал', href: '/moderator/journal' },
        { label: 'Выдача и сверка', href: '/moderator/issue' },
        { label: 'Каталог', href: '/moderator/catalog' },
        { label: 'Импорт из таблицы', href: '/moderator/catalog/import' },
        { label: 'Добавить книгу', href: '/moderator/catalog/book' },
      ]}
    />
  );
}
