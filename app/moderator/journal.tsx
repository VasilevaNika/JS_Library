import { StubScreen } from '@/components/StubScreen';

export default function JournalScreen() {
  return (
    <StubScreen
      title="M1 Журнал броней"
      links={[
        { label: 'Журнал', href: '/moderator/journal' },
        { label: 'Выдача и сверка', href: '/moderator/issue' },
        { label: 'Каталог', href: '/moderator/catalog' },
      ]}
    />
  );
}
