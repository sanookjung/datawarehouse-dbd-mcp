/**
 * MCP tool definitions. Each tool is a thin glue between the MCP request
 * schema and the corresponding api/* function. Descriptions are in Thai
 * so Thai-language LLM clients pick the right tool; the schemas use
 * JSON-Schema-friendly Zod types for validation.
 */
import { z } from "zod";
import * as api from "./api/index.ts";

export interface Tool {
  name: string;
  description: string;
  inputSchema: z.ZodType<any>;
  handler: (input: any) => Promise<unknown>;
}

const JuristicId = z.string().regex(/^\d{13}$/, "ต้องเป็นเลขทะเบียนนิติบุคคล 13 หลัก");

export const tools: Tool[] = [
  {
    name: "search_juristic",
    description:
      "ค้นหานิติบุคคลไทยจากชื่อหรือเลขทะเบียน 13 หลัก. คืนค่ารายการนิติบุคคลที่ตรงกับคำค้น (ชื่อบริษัท, ห้างหุ้นส่วน, ฯลฯ).\n" +
      "Search Thai juristic persons by name or 13-digit registration ID.",
    inputSchema: z.object({
      keyword: z.string().min(1).describe("คำค้น เช่น 'ปตท' หรือเลข 13 หลัก"),
      sortBy: z.string().optional().describe("เรียงตามฟิลด์ (ค่าเริ่มต้น jpName)"),
      page: z.number().int().positive().optional().describe("หน้าของผลลัพธ์ เริ่มที่ 1"),
    }),
    handler: ({ keyword, sortBy, page }) =>
      api.company.searchJuristic({ keyword, sortBy, currentPage: page }),
  },

  {
    name: "get_juristic_profile",
    description:
      "ดึงข้อมูลพื้นฐานของนิติบุคคล: สถานะ, ที่ตั้ง, ทุนจดทะเบียน, ประเภทธุรกิจ, วันที่จดทะเบียน.\n" +
      "Get basic profile (status, address, capital, business type, registration date).",
    inputSchema: z.object({ juristicId: JuristicId }),
    handler: ({ juristicId }) => api.company.getProfile(juristicId),
  },

  {
    name: "get_juristic_directors",
    description:
      "ดึงรายชื่อกรรมการของนิติบุคคล (committees).\n" + "Get the list of directors / committee members.",
    inputSchema: z.object({ juristicId: JuristicId }),
    handler: ({ juristicId }) => api.company.getCommittees(juristicId),
  },

  {
    name: "get_juristic_signatories",
    description:
      "ดึงข้อมูลอำนาจกรรมการลงนาม (committee-signs).\n" + "Get authorized signatory information.",
    inputSchema: z.object({ juristicId: JuristicId }),
    handler: ({ juristicId }) => api.company.getSignCommittees(juristicId),
  },

  {
    name: "get_juristic_objectives",
    description:
      "ดึงวัตถุประสงค์การประกอบกิจการ (descriptions).\n" + "Get business objective descriptions.",
    inputSchema: z.object({ juristicId: JuristicId }),
    handler: ({ juristicId }) => api.company.getDescriptions(juristicId),
  },

  {
    name: "get_juristic_partners",
    description:
      "ดึงรายชื่อผู้ถือหุ้นหรือหุ้นส่วน.\n" + "Get shareholders / partners.",
    inputSchema: z.object({ juristicId: JuristicId }),
    handler: ({ juristicId }) => api.company.getPartners(juristicId),
  },

  {
    name: "get_juristic_capital_history",
    description:
      "ดึงประวัติการเปลี่ยนแปลงทุนจดทะเบียน.\n" + "Get registered-capital change history.",
    inputSchema: z.object({ juristicId: JuristicId }),
    handler: ({ juristicId }) => api.company.getCapitalHistory(juristicId),
  },

  {
    name: "get_juristic_name_history",
    description:
      "ดึงประวัติการเปลี่ยนชื่อนิติบุคคล.\n" + "Get history of juristic person name changes.",
    inputSchema: z.object({ juristicId: JuristicId }),
    handler: ({ juristicId }) => api.company.getNameHistory(juristicId),
  },

  {
    name: "get_juristic_mergers",
    description:
      "ดึงข้อมูลการควบรวม/แปรสภาพ.\n" + "Get merger and transformation history.",
    inputSchema: z.object({ juristicId: JuristicId }),
    handler: ({ juristicId }) => api.company.getMergers(juristicId),
  },

  {
    name: "get_juristic_liquidators",
    description:
      "ดึงข้อมูลผู้ชำระบัญชี (ถ้ามี).\n" + "Get liquidator information (when applicable).",
    inputSchema: z.object({ juristicId: JuristicId }),
    handler: ({ juristicId }) => api.company.getLiquidators(juristicId),
  },

  {
    name: "get_juristic_nationalities",
    description:
      "ดึงสัดส่วนสัญชาติของผู้ถือหุ้น.\n" + "Get shareholder nationality breakdown.",
    inputSchema: z.object({ juristicId: JuristicId }),
    handler: ({ juristicId }) => api.company.getNations(juristicId),
  },

  // ---- Financial statements ----
  {
    name: "get_financial_basics",
    description:
      "ดึงรายการสำคัญของงบการเงิน เช่น รายได้ กำไร สินทรัพย์ หนี้สิน. ระบุ fiscalYear เพื่อเจาะจงปีงบประมาณ.\n" +
      "Get key financial figures (income, profit, assets, liabilities) for a juristic person.",
    inputSchema: z.object({
      juristicId: JuristicId,
      fiscalYear: z.number().int().optional().describe("ปีงบประมาณ ค.ศ. (เช่น 2024) — เว้นว่างเพื่อปีล่าสุด"),
    }),
    handler: ({ juristicId, fiscalYear }) => api.financial.getBasics(juristicId, fiscalYear),
  },

  {
    name: "get_financial_submit_history",
    description:
      "ดึงประวัติการนำส่งงบการเงิน.\n" + "Get the submission history of financial statements.",
    inputSchema: z.object({
      juristicId: JuristicId,
      fiscalYear: z.number().int().optional(),
    }),
    handler: ({ juristicId, fiscalYear }) => api.financial.getSubmitHistory(juristicId, fiscalYear),
  },

  {
    name: "get_financial_charts",
    description:
      "ดึงข้อมูลกราฟแสดงรายการสำคัญทางการเงินย้อนหลัง.\n" + "Get charting data for the basic financial metrics.",
    inputSchema: z.object({ juristicId: JuristicId }),
    handler: ({ juristicId }) => api.financial.getBasicCharts(juristicId),
  },

  // ---- Foreign juristic persons ----
  {
    name: "search_foreign_juristic",
    description:
      "ค้นหานิติบุคคลต่างประเทศที่ได้รับใบอนุญาตประกอบธุรกิจในไทย.\n" +
      "Search foreign juristic persons licensed to operate in Thailand.",
    inputSchema: z.object({
      keyword: z.string().min(1),
      sortBy: z.string().optional(),
      page: z.number().int().positive().optional(),
    }),
    handler: ({ keyword, sortBy, page }) =>
      api.foreign.searchForeign({ keyword, sortBy, currentPage: page }),
  },

  {
    name: "get_foreign_profile",
    description:
      "ดึงข้อมูลพื้นฐานของนิติบุคคลต่างประเทศ.\n" + "Get profile of a foreign juristic person.",
    inputSchema: z.object({ juristicId: z.string().min(1) }),
    handler: ({ juristicId }) => api.foreign.getForeignProfile(juristicId),
  },

  {
    name: "get_foreign_business_types",
    description:
      "ดึงประเภทธุรกิจที่นิติบุคคลต่างประเทศได้รับใบอนุญาต.\n" + "Get permitted business types of a foreign juristic person.",
    inputSchema: z.object({ juristicId: z.string().min(1) }),
    handler: ({ juristicId }) => api.foreign.getForeignBusinessTypes(juristicId),
  },

  {
    name: "get_foreign_directors",
    description:
      "ดึงรายชื่อกรรมการนิติบุคคลต่างประเทศ.\n" + "Get directors of a foreign juristic person.",
    inputSchema: z.object({ juristicId: z.string().min(1) }),
    handler: ({ juristicId }) => api.foreign.getForeignDirectors(juristicId),
  },

  // ---- Business type (TSIC) ----
  {
    name: "list_biztypes",
    description:
      "ดึงรายการประเภทธุรกิจ (TSIC).\n" + "List Thai Standard Industrial Classification (TSIC) business types.",
    inputSchema: z.object({}),
    handler: () => api.biztype.getBizTypeIndex(),
  },

  {
    name: "get_biztype",
    description:
      "ดึงรายละเอียดประเภทธุรกิจตามรหัส TSIC.\n" + "Get a TSIC business type by code.",
    inputSchema: z.object({ code: z.string().min(1).describe("รหัส TSIC") }),
    handler: ({ code }) => api.biztype.getBizTypeMain(code),
  },

  {
    name: "get_biztype_overview",
    description:
      "ดึงเนื้อหา overview ของประเภทธุรกิจ (สรุปสถิติ).\n" + "Get overview content of a TSIC business type.",
    inputSchema: z.object({ code: z.string().min(1) }),
    handler: ({ code }) => api.biztype.getBizTypeOverviewContents(code),
  },

  // ---- Area ----
  {
    name: "get_area_summary",
    description:
      "ดึงข้อมูลสรุปนิติบุคคลรายพื้นที่ (จังหวัด/อำเภอ).\n" + "Get area-based juristic-person summary.",
    inputSchema: z.object({
      filter: z
        .object({})
        .passthrough()
        .describe("ตัวกรองตามรูปแบบ DBD เช่น { pvCode, ampurCode, monthNo, businessSizeCode }"),
    }),
    handler: ({ filter }) => api.area.getAreaSummary(filter),
  },

  // ---- Stats ----
  {
    name: "get_register_stat",
    description: "สถิติการจดทะเบียนนิติบุคคล. / Registration statistics.",
    inputSchema: z.object({ filter: z.object({}).passthrough().describe("ตัวกรองตามรูปแบบ DBD") }),
    handler: ({ filter }) => api.stats.getRegisterStat(filter),
  },

  {
    name: "get_juristic_ranking",
    description: "การจัดอันดับนิติบุคคล. / Juristic person rankings.",
    inputSchema: z.object({ filter: z.object({}).passthrough() }),
    handler: ({ filter }) => api.stats.getJuristicRanking(filter),
  },

  // ---- Business opportunity (industry benchmarks) ----
  {
    name: "get_industry_fin_benchmark",
    description:
      "ดูค่าเฉลี่ย/มัธยฐานรายการสำคัญทางการเงินของอุตสาหกรรม.\n" + "Industry-level financial benchmark figures.",
    inputSchema: z.object({ filter: z.object({}).passthrough() }),
    handler: ({ filter }) => api.bizopp.getBasicFinBenchmark(filter),
  },

  {
    name: "get_industry_fin_ratios",
    description:
      "ดูค่าเฉลี่ย/มัธยฐานของอัตราส่วนทางการเงินรายอุตสาหกรรม.\n" + "Industry-level financial ratio benchmarks.",
    inputSchema: z.object({ filter: z.object({}).passthrough() }),
    handler: ({ filter }) => api.bizopp.getFinRatioBenchmark(filter),
  },

  // ---- Supply chain partners ----
  {
    name: "get_supply_chain",
    description:
      "ดึงข้อมูลเครือข่ายคู่ค้า (supply chain) ตามตัวกรอง.\n" + "Get supply-chain network data for a filter.",
    inputSchema: z.object({ filter: z.object({}).passthrough() }),
    handler: ({ filter }) => api.bizpartner.getSupplyChain(filter),
  },
];
