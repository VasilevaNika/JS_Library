# MCP-сервер «Библиотеки кампуса»

Даёт Claude Desktop те же действия, что формы приложения: поиск, бронь, очередь, возврат, профиль,
а для модератора — журнал, выдача, сверка, каталог и импорт. Подробное объяснение для неспециалиста —
[`docs/MCP.md`](../docs/MCP.md).

Нужен Node.js 22.5 или новее (проверить: `node --version`).

## Сборка и проверка

```bash
cd mcp-server
npm install
npm run build      # dist/index.js — один файл, его запускает Claude Desktop
npm test           # юнит-тесты всех инструментов
npm run inspect    # MCP Inspector в браузере от имени студента
npm run inspect:moderator
```

В Inspector: **Connect** → вкладка **Tools** → **List Tools** → выбрать инструмент, заполнить поля, **Run Tool**.

## Подключение к Claude Desktop (Windows, версия из Microsoft Store)

Файл настроек:
`%LOCALAPPDATA%\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\claude_desktop_config.json`

Откройте его (Win+R → вставить путь → Enter, выбрать Блокнот) и добавьте в него блок `mcpServers`.
Если в файле уже есть другие настройки, добавьте `"mcpServers": { … }` рядом с ними через запятую.

```json
{
  "mcpServers": {
    "campus-library": {
      "command": "C:\\Program Files\\nodejs\\node.exe",
      "args": ["C:\\Users\\Daniil\\Desktop\\Campus_Library\\mcp-server\\dist\\index.js"],
      "env": {
        "LIBRARY_USER_EMAIL": "anna.smirnova@mail.ru",
        "LIBRARY_ROLE": "student",
        "LIBRARY_DB_PATH": "C:\\Users\\Daniil\\Desktop\\Campus_Library\\server\\data\\library.db"
      }
    }
  }
}
```

- `LIBRARY_USER_EMAIL` — от чьего имени действует Claude. Для модератора: `moderator@campus.test` и `LIBRARY_ROLE` = `moderator`.
- `LIBRARY_DB_PATH` — та же база, что у общего сервера `server/`: так приложение и Claude видят одни данные.
- После правки полностью закройте Claude Desktop (значок в трее → Quit) и откройте снова.
  В окне чата у кнопки инструментов появится `campus-library`.

## Демо-сценарий для защиты

База — тестовые данные (сбросить: удалить `server/data/library.db`, он создастся заново).
Пользователь — студентка Анна Смирнова. Все шаги проверены через Inspector.

| # | Фраза в Claude Desktop | Инструменты | Ожидаемый результат |
|---|---|---|---|
| 1 | «Есть ли в библиотеке „Грокаем алгоритмы“?» | `search_books` | «[id 3] «Грокаем алгоритмы» — А. Бхаргава, 2022… В наличии (на полке 3 из 4).» |
| 2 | «Забронируй мне „Компьютерные сети“» | `search_books` → `create_booking` | «Бронь оформлена: «Компьютерные сети». Книга ждёт вас до …, 20:00. Код брони: XXXXXX» |
| 3 | «Какие книги у меня сейчас и что просрочено?» | `list_my_bookings` | Список активных броней с кодами; «Грокаем алгоритмы» — «Просрочено, вернуть до …» |
| 4 | «Отмени эту бронь» → Claude спрашивает → «Да» | `cancel_booking` без `confirm`, затем с `confirm: true` | Сначала вопрос «Отменить бронь на «Компьютерные сети»? Книга сразу станет доступна другим.», после «Да» — «Бронь … отменена» |
| 5 | «Покажи журнал выдач всех студентов» | `list_journal` | Отказ: «Это действие доступно только модератору библиотеки. Сейчас вы работаете как студент (…).» |

Дополнительно, от имени модератора: «Выдай книгу по коду 7KQ4MX» → Claude показывает, что будет выдано,
и после подтверждения отвечает «Выдано: «Алгоритмы. Построение и анализ» → Анна Смирнова, вернуть до …».

Каждое изменяющее действие записано в таблицу `mcp_audit` той же базы.
