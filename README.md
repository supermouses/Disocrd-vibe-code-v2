# Discord Bot + MongoDB

Bot Discord cơ bản dùng **discord.js v14** và **MongoDB (mongoose)**.

## Chức năng

| Lệnh | Mô tả |
|---|---|
| `/ping` | Kiểm tra độ trễ |
| `/rank [user]` | Xem level, XP, hạng |
| `/daily` | Điểm danh nhận 100 xu mỗi 24h |
| `/balance [user]` | Xem số xu |
| `/leaderboard [type]` | Top 10 theo level hoặc xu |
| `/warn user [reason]` | Cảnh cáo thành viên (cần quyền Moderate Members) |
| `/warnings user` | Xem lịch sử cảnh cáo |
| `/setwelcome channel [message]` | Cài kênh chào mừng (cần quyền Manage Server). Dùng `{user}`, `{server}` |

### Phát nhạc (không quảng cáo, file lưu trong MongoDB)

Nhạc được tải lên dưới dạng file và lưu trong MongoDB bằng GridFS, nên phát trực tiếp từ database, không có quảng cáo.

| Lệnh | Mô tả |
|---|---|
| `/addsong file [title]` | Tải file nhạc lên thư viện (tối đa 25MB, 100 bài/server) |
| `/songs [page]` | Xem thư viện nhạc |
| `/play song` | Vào kênh thoại và phát (có gợi ý tên khi gõ) |
| `/playurl url [title]` | Phát từ link trực tiếp tới file âm thanh (.mp3, .ogg...) hoặc radio stream |
| `/queue` `/skip` `/pause` `/resume` `/stop` | Điều khiển phát nhạc |
| `/removesong song` | Xóa bài (người tải lên hoặc quyền Manage Server) |

Yêu cầu Node.js 22.12+. Bot tự rời kênh thoại sau 2 phút không có nhạc.

### Trò chơi nối từ (ai cũng chơi được)

Mỗi kênh đặt một ngôn ngữ (Tiếng Việt hoặc English). Bot làm quản trò: tự kiểm tra luật nối, từ điển, từ đã dùng.

| Lệnh | Mô tả |
|---|---|
| `/wordchain setup channel language` | Bật nối từ cho kênh (cần quyền Manage Server) |
| `/wordchain stop [channel]` | Tắt nối từ |
| `/wordchain reset` | Bắt đầu lại chuỗi với từ mới |
| `/wcrank` | Bảng xếp hạng và tình trạng chuỗi hiện tại |

Luật:
- **English**: từ mới bắt đầu bằng chữ cái cuối của từ trước. Từ được kiểm tra qua từ điển trong MongoDB, chưa có thì hỏi [Free Dictionary API](https://dictionaryapi.dev) rồi lưu lại.
- **Tiếng Việt**: từ gồm 2 tiếng, tiếng đầu = tiếng cuối của từ trước. Từ chưa có trong từ điển sẽ được mọi người bỏ phiếu ✅/❌ (cần ít nhất 2 người khác bấm ✅ trong 20 giây), được duyệt thì lưu vào MongoDB.
- Không dùng lại từ đã dùng, không trả lời 2 lần liên tiếp. Phản hồi: ❌ sai luật/không có trong từ điển, 🔁 đã dùng, ⏳ vừa trả lời.
- Cứ 8 từ nối thành công, bot đăng một câu tục ngữ/thành ngữ có chỗ trống, ai điền đúng trước được +3 điểm. Hết 60 giây bot công bố đáp án.
- Tin nhắn bắt đầu bằng `//` được bỏ qua (để trò chuyện thường).

Bot cần **Message Content Intent** (bật trong Developer Portal, tab Bot). Từ điển nạp sẵn từ `data/vi.txt` và `data/en.txt` (mỗi dòng một từ). Thêm từ vào file rồi chạy `npm run seed` để nạp lại.

Ngoài ra: nhắn tin trong server sẽ nhận 15–25 XP (cooldown 60s) và tự lên level.

## Cài đặt

1. Tạo bot tại https://discord.com/developers/applications
   - Tab **Bot**: copy token, bật **Server Members Intent**.
   - Tab **General Information**: copy Application ID.
2. Mời bot vào server (OAuth2 → URL Generator → scope `bot` + `applications.commands`).
3. Chạy MongoDB (local hoặc dùng MongoDB Atlas, rồi dán URI vào `.env`).
4. Cài đặt:

```bash
npm install
cp .env.example .env   # rồi điền token, CLIENT_ID, GUILD_ID, MONGODB_URI
npm run deploy         # đăng ký slash command
npm start              # chạy bot (hoặc npm run dev để tự reload)
```

## Cấu trúc

```
src/
├── index.js              # khởi động, nạp lệnh/sự kiện, kết nối MongoDB
├── deploy-commands.js    # đăng ký slash command
├── commands/             # mỗi file là một lệnh
├── events/               # ready, interactionCreate, messageCreate, guildMemberAdd
├── models/               # User, Warn, GuildConfig (mongoose)
└── utils/levels.js
```

Muốn thêm lệnh: tạo file mới trong `src/commands/` với `data` và `execute`, rồi chạy lại `npm run deploy`.
