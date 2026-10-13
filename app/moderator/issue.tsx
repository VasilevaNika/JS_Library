import { StubScreen } from '@/components/StubScreen';

export default function IssueScreen() {
  return (
    <StubScreen
      title="M2 Выдача и сверка"
      links={[
        { label: 'Журнал', href: '/moderator/journal' },
        { label: 'Выдача и сверка', href: '/moderator/issue' },
        { label: 'Каталог', href: '/moderator/catalog' },
      ]}
    />
  );
}
