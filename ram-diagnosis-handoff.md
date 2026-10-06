# Діагностика RAM 94% — передача в нову локальну сесію

## Контекст
- ПК: Windows 11, 16 ГБ DDR5 (15,3 ГБ доступно), AMD Radeon 760M + RTX 3050 6GB, SSD NVMe.
- Користувач — тестувальник веб- та мобільних застосунків. Відповіді: коротко, без води, українською.
- Попередня сесія була хмарною (Linux-контейнер), доступу до ПК не мала. Нова сесія має бути **Local** (Claude Code на ПК).

## Що з'ясовано
- Диспетчер завдань: використано 14,4 / 15,3 ГБ (94%), вільно ~0,9–1,5 ГБ. Commit 27,4 / 29,4 ГБ.
- Вкладка «Процеси» без причини не показувала головного споживача.
- PowerShell `Get-Process` за PrivateMemorySize64:

| Процес | PID | Commit МБ | WS МБ |
|---|---|---|---|
| **llama-server** | 22812 | **7308** | **5578** |
| claude | 14768 | 801 | 660 |
| ctfmon | 14592 | 603 | 106 |
| OneDrive | 15256 | 597 | 426 |
| llama-server | 19644 | 590 | 20 |
| mysqld | 8548 | 581 | 2 |
| claude | 5620 | 472 | 103 |
| ChatGPT | 7860 | 468 | 306 |
| Telegram | 24720 | 451 | 66 |
| claude | 18852 | 405 | 76 |

- **Головна причина:** `llama-server` (PID 22812) ≈ 7,3 ГБ commit / 5,6 ГБ WS. Користувач не пам'ятає, що запускав його.
- `Get-Counter` дав помилку `c0000bb8` — зламані лічильники продуктивності (виправлення: `lodctr /R` від адміністратора). До пам'яті не стосується.
- `wsl --list --running` не встиг виконатись; `vmmem*` не знайдено.

## Завдання для нової сесії
1. Дізнатись, хто запустив `llama-server`:
   ```powershell
   Get-CimInstance Win32_Process -Filter "Name='llama-server.exe'" | Select ProcessId, ParentProcessId, ExecutablePath, CommandLine
   Get-Process -Id <ParentProcessId>
   ```
   За `ExecutablePath` визначити програму (LM Studio / Jan / Ollama / koboldcpp / інше), за `CommandLine` — модель (`-m ...gguf`).
2. Показати користувачу результат і **попросити підтвердження**, потім завершити процес:
   ```powershell
   Stop-Process -Name llama-server -Force
   ```
3. Знайти автозапуск і вимкнути його: Диспетчер завдань → Автозавантаження, також `Get-CimInstance Win32_StartupCommand`, `schtasks /query`, служби.
4. Опційно (запитати користувача): зупинити `mysqld` (581 МБ), якщо БД зараз не потрібна.
5. Перевірити результат:
   ```powershell
   Get-CimInstance Win32_OperatingSystem | Select @{n='TotalGB';e={[math]::Round($_.TotalVisibleMemorySize/1MB,1)}}, @{n='FreeGB';e={[math]::Round($_.FreePhysicalMemory/1MB,1)}}
   ```
   Очікування: RAM ≈ 55–60%.
6. Якщо модель потрібна: зменшити квантизацію (Q4), контекст `-c`, прибрати `--mlock`.
7. Опційно: `lodctr /R` для лічильників (від адміністратора).

## Робоча папка
- Усі файли цієї роботи (скрипти, логи, звіти) створювати в **`D:\ClaudeWork\ram-diagnosis\`**. Папку створити командою `New-Item -ItemType Directory -Force D:\ClaudeWork\ram-diagnosis`.
- Перед створенням перевірити, що диск D: існує: `Get-PSDrive D`.
- Не видаляти й не змінювати нічого поза цією папкою без підтвердження користувача.

## Правила
- Деструктивні дії (завершення процесів, зупинка служб, зміна автозапуску) — лише після підтвердження.
- Відповіді коротко, українською.
