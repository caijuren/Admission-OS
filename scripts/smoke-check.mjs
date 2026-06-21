import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const requiredFiles = [
  "src/app/page.tsx",
  "src/app/goals/page.tsx",
  "src/app/weekly/page.tsx",
  "src/app/weekly/report/page.tsx",
  "src/app/timeline/page.tsx",
  "src/app/grades/page.tsx",
  "src/app/reading/page.tsx",
  "src/app/settings/page.tsx",
  "src/app/api/data/route.ts",
  "src/app/api/ai/progress-drafts/route.ts",
  "src/components/app-shell.tsx",
  "data/eduos.json",
];

const contentChecks = [
  {
    file: "src/app/dashboard-page-client.tsx",
    includes: ["Admission Command Center", "下一步行动", "升学路径地图"],
  },
  {
    file: "src/app/weekly/page.tsx",
    includes: ["今日行动", "记录完成", "确认同步"],
  },
  {
    file: "src/app/goals/page.tsx",
    includes: ["目标地图", "新增任务", "任务看板已保存"],
  },
  {
    file: "src/app/advisor/page.tsx",
    includes: ["Advisor Workspace", "计划诊断与行动建议", "待处理信号"],
  },
  {
    file: "src/app/reading/page.tsx",
    includes: ["Evidence System", "阅读表达证据库", "申请亮点"],
  },
  {
    file: "src/components/app-shell.tsx",
    includes: ["Admission OS", "目标地图", "周计划"],
  },
];

const failures = [];

for (const file of requiredFiles) {
  try {
    await access(path.join(root, file), constants.R_OK);
  } catch {
    failures.push(`Missing required file: ${file}`);
  }
}

for (const check of contentChecks) {
  try {
    const source = await readFile(path.join(root, check.file), "utf8");
    for (const expected of check.includes) {
      if (!source.includes(expected)) {
        failures.push(`${check.file} does not include "${expected}"`);
      }
    }
  } catch {
    failures.push(`Unable to read ${check.file}`);
  }
}

if (failures.length) {
  console.error("Smoke check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Smoke check passed: ${requiredFiles.length} files and ${contentChecks.length} content checks.`);
