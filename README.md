# datawarehouse-dbd-mcp

MCP server สำหรับ [datawarehouse.dbd.go.th](https://datawarehouse.dbd.go.th)
ของกรมพัฒนาธุรกิจการค้า (DBD) — ค้นหาและดึงข้อมูลนิติบุคคลไทย, นิติบุคคลต่างประเทศ,
งบการเงิน, รายชื่อกรรมการ, ผู้ถือหุ้น, สถิติการจดทะเบียน ฯลฯ เป็น tool ผ่าน
Model Context Protocol.

> An MCP server that wraps the public Thai Department of Business Development
> data-warehouse API as a clean set of tools. Documentation is primarily in
> Thai; code comments are in English.

## คุณสมบัติ / Features

- 🔎 **ค้นหานิติบุคคล** ตามชื่อหรือเลขทะเบียน 13 หลัก
- 🏢 **ดึงข้อมูลพื้นฐาน** เช่น สถานะ, ที่ตั้ง, ทุนจดทะเบียน, ทรัพย์สิน, กำไรสุทธิ
- 👥 **กรรมการ, ผู้ลงนาม, ผู้ถือหุ้น/หุ้นส่วน**
- 📜 **ประวัติการเปลี่ยนชื่อ, ทุนจดทะเบียน, การควบรวม/แปรสภาพ**
- 💰 **งบการเงิน** (basic/charts/submit history)
- 🌏 **นิติบุคคลต่างประเทศ** ที่ได้รับใบอนุญาตในไทย
- 📊 **สถิติการจดทะเบียน, การจัดอันดับ, รายงานรายพื้นที่**
- 🏷️ **TSIC** (Thai Standard Industrial Classification) lookup
- 🤝 **Supply chain / partner network** จาก /partner endpoints
- 📈 **Industry benchmarks** ค่าเฉลี่ย/มัธยฐานรายอุตสาหกรรม

## สถาปัตยกรรม / Architecture

DBD ใช้ Incapsula WAF + ส่งคำตอบเป็นซองเข้ารหัส AES-GCM. โครงสร้างของ MCP
server นี้ออกแบบให้เป็น **wrapper REST API ที่บางและเรียบง่าย**:

```
src/
├── index.ts        เริ่ม MCP server (stdio transport)
├── session.ts      bootstrap session ครั้งเดียวด้วย Playwright headless
│                   ดึง Incapsula cookies + JWT แล้วใช้ Bun fetch ทำ request ต่อ
├── crypto.ts       ถอดรหัสซอง AES-GCM + HKDF-SHA256 + zlib inflate
├── tools.ts        นิยาม MCP tools พร้อมคำอธิบายภาษาไทย/อังกฤษ
└── api/
    ├── company.ts     /v1/company-profiles/* (search, directors, partners, …)
    ├── financial.ts   /v1/fin/* (งบการเงิน)
    ├── foreign.ts     /v1/foreign/* (นิติบุคคลต่างประเทศ)
    ├── biztype.ts     /v1/biztype/* (TSIC)
    ├── investment.ts  /v1/investment/* (การลงทุนต่างชาติ)
    ├── area.ts        /v1/area/* (รายพื้นที่)
    ├── stats.ts       /v1/stats/* (สถิติ)
    ├── bizpartner.ts  /v1/partner/* (supply chain)
    ├── bizopp.ts      /v1/bizopp/* (industry benchmarks)
    └── util.ts        ฟังก์ชันช่วย (split juristic ID เป็น 2 ส่วน)
```

Playwright ใช้แค่ตอน bootstrap session (ครั้งแรก) เพื่อผ่าน WAF challenge.
หลังจากนั้นทุก request ไปยัง `/api/*` ใช้ Bun fetch ตรง — เร็ว, เบา.

## การติดตั้ง / Installation

ต้องการ [Bun](https://bun.sh) v1.3+ และจะติดตั้ง Chromium ให้อัตโนมัติ
สำหรับใช้ bootstrap session.

```bash
bun install
# postinstall จะรัน playwright install chromium ให้
```

ถ้าจำเป็นติดตั้ง Chromium ด้วยตนเอง:

```bash
bunx playwright install chromium
```

## การใช้งาน / Usage

### รันแบบ stdio

```bash
bun src/index.ts
```

### ตั้งค่าใน Claude Desktop

แก้ไข `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dbd": {
      "command": "bun",
      "args": ["/absolute/path/to/datawarehouse-dbd-mcp/src/index.ts"]
    }
  }
}
```

### ตั้งค่าใน Claude Code

```bash
claude mcp add dbd -- bun /absolute/path/to/datawarehouse-dbd-mcp/src/index.ts
```

## รายการ Tool ทั้งหมด / Tool reference

| Tool | คำอธิบาย |
|------|----------|
| `search_juristic` | ค้นหานิติบุคคลไทยจากชื่อ/เลข 13 หลัก |
| `get_juristic_profile` | ข้อมูลพื้นฐาน (สถานะ, ที่ตั้ง, ทุน, กำไร, ฯลฯ) |
| `get_juristic_directors` | รายชื่อกรรมการ |
| `get_juristic_signatories` | ผู้มีอำนาจลงนาม |
| `get_juristic_objectives` | วัตถุประสงค์การประกอบกิจการ |
| `get_juristic_partners` | ผู้ถือหุ้น / หุ้นส่วน |
| `get_juristic_capital_history` | ประวัติเปลี่ยนทุนจดทะเบียน |
| `get_juristic_name_history` | ประวัติเปลี่ยนชื่อ |
| `get_juristic_mergers` | การควบรวม / แปรสภาพ |
| `get_juristic_liquidators` | ผู้ชำระบัญชี |
| `get_juristic_nationalities` | สัดส่วนสัญชาติผู้ถือหุ้น |
| `get_financial_basics` | งบการเงินรายการสำคัญ (ระบุ `fiscalYear` ปี ค.ศ. เพื่อเจาะจง) |
| `get_financial_submit_history` | ประวัติการนำส่งงบการเงิน |
| `get_financial_charts` | ข้อมูลกราฟแสดงผลทางการเงิน |
| `search_foreign_juristic` | ค้นหานิติบุคคลต่างประเทศ |
| `get_foreign_profile` | ข้อมูลพื้นฐานนิติบุคคลต่างประเทศ |
| `get_foreign_business_types` | ประเภทธุรกิจที่ได้รับใบอนุญาต |
| `get_foreign_directors` | กรรมการนิติบุคคลต่างประเทศ |
| `list_biztypes` | รายการ TSIC ทั้งหมด |
| `get_biztype` | รายละเอียดประเภทธุรกิจ (TSIC) ตามรหัส |
| `get_biztype_overview` | overview ของประเภทธุรกิจ |
| `get_area_summary` | สรุปนิติบุคคลรายพื้นที่ |
| `get_register_stat` | สถิติการจดทะเบียน |
| `get_juristic_ranking` | การจัดอันดับนิติบุคคล |
| `get_industry_fin_benchmark` | ค่าเฉลี่ย/มัธยฐานรายการการเงินรายอุตสาหกรรม |
| `get_industry_fin_ratios` | ค่าเฉลี่ย/มัธยฐานอัตราส่วนการเงินรายอุตสาหกรรม |
| `get_supply_chain` | เครือข่ายคู่ค้า (supply chain) |

## ตัวอย่าง / Examples

```jsonc
// ค้นหา "ปตท"
{
  "name": "search_juristic",
  "arguments": { "keyword": "ปตท" }
}

// ดึงข้อมูลพื้นฐาน PTT (เลขทะเบียน 0107544000108)
{
  "name": "get_juristic_profile",
  "arguments": { "juristicId": "0107544000108" }
}

// ดึงประวัติทุนจดทะเบียน
{
  "name": "get_juristic_capital_history",
  "arguments": { "juristicId": "0107544000108" }
}
```

## ข้อจำกัด / Limitations

- **Tier anonymous**: server นี้ใช้ token แบบ `ROLE_ANONYMOUS` ที่ DBD เปิดให้
  สาธารณะ. บาง endpoint จะคืนผลลัพธ์ว่าง (`[]` หรือ field เป็น `null`) สำหรับ
  ผู้ใช้ที่ไม่ได้ล็อกอิน. ข้อมูลภาพรวม/ค้นหา/งบการเงินรายการสำคัญยังใช้ได้
- **Incapsula challenge**: เปิด session ใหม่จะใช้เวลา 3–5 วินาที (โหลด
  Chromium ผ่าน WAF). หลังจาก warm-up แล้ว request ต่อ ๆ ไปเป็น HTTP fetch
  ปกติ; JWT จะรีเฟรชอัตโนมัติก่อนหมดอายุ
- **Response encryption**: response บาง endpoint เข้ารหัสเป็น envelope
  `{kid,salt,iv,ct}` AES-GCM + HKDF-SHA256, ถอดรหัสฝั่ง client (`crypto.ts`)
- **ไม่ใช่ API ทางการ**: เป็นการ wrap endpoint ภายในของหน้าเว็บ. ถ้า DBD
  เปลี่ยนโครงสร้าง เซิร์ฟเวอร์นี้อาจต้องปรับตาม

## License

MIT. โครงการนี้ไม่ได้รับการสนับสนุนหรือร่วมมือกับกรมพัฒนาธุรกิจการค้าโดยตรง
— เป็นเครื่องมือ open-source ที่ช่วยให้นักพัฒนาเข้าถึงข้อมูลสาธารณะของ DBD
ได้ง่ายขึ้น
