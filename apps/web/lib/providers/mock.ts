/**
 * Mock provider — deterministic responses that pass every prompt's Zod
 * schema. Used in CI, offline development, and when AI_PROVIDER=mock.
 */
import type { LlmCall, LlmProvider } from "./types";

const MOCK_JOB_SIGNALS = {
  keywords: ["STM32", "Nordic nRF", "BLE", "SPI", "I2C", "CAN", "FreeRTOS", "Docker", "InfluxDB", "Grafana"],
  requiredSkills: ["C", "C++", "ARM Cortex-M", "BLE", "SPI", "I2C", "RTOS", "Git"],
  preferredSkills: ["Docker", "InfluxDB", "Grafana", "Python", "Go", "TypeScript", "Robotics"],
  roleThemes: ["embedded firmware", "industrial IoT", "calibration tooling", "team collaboration"],
  suggestedEmphasis: [
    "Hands-on firmware experience on STM32 / Nordic nRF",
    "Industrial IoT and cloud data pipelines",
    "Calibration tooling and bench debugging",
    "Project leadership end-to-end",
  ],
};

const MOCK_TAILORED_SUMMARY =
  "Hands-on embedded systems engineer with firmware experience on STM32 and Nordic nRF platforms, BLE/SPI/I2C bring-up, and industrial IoT integrations using Docker, InfluxDB, and Grafana. Comfortable owning features from bench debugging to deployed product.";

/**
 * Phase 3.5 mock: bullets now carry `suggestedKeywords` — a subset of each
 * bullet's input keywords[]. The mock targets the same seed bullets as before;
 * the BulletPicker in the UI shows checkboxes for every master bullet.
 */
const MOCK_BULLET_REWRITES = [
  {
    targetId: "hes-so-research-assistant#0",
    original:
      "Built calibration tooling and APIs in Go and C++/Qt for industrial PLC deployments.",
    suggested:
      "Accomplished bench-validated calibration tooling for industrial PLC deployments by designing Go and C++/Qt APIs that streamlined hardware test cycles.",
    rationale:
      "STAR rewrite: leads with the verb, makes the measurable outcome (streamlined hardware test cycles) explicit, and keeps the underlying tools intact.",
    suggestedKeywords: ["Go", "C++", "Qt", "PLC", "Calibration software"],
  },
  {
    targetId: "hes-so-research-assistant#1",
    original:
      "Designed and deployed a private 5G station, handling SIM provisioning and performance analysis.",
    suggested:
      "Accomplished a production-ready private 5G station, as measured by successful SIM provisioning and throughput benchmarks, by designing and deploying it end-to-end.",
    rationale:
      "STAR rewrite that surfaces a measurable outcome (provisioning + throughput) without fabricating numbers.",
    suggestedKeywords: ["Private 5G", "SIM provisioning", "Performance analysis"],
  },
  {
    targetId: "hes-so-research-assistant#2",
    original:
      "Implemented monitoring dashboards in Grafana over InfluxDB time-series data.",
    suggested:
      "Accomplished operator visibility into industrial telemetry by implementing Grafana dashboards over InfluxDB time-series data.",
    rationale:
      "STAR rewrite that ties the dashboards to operator visibility, the measurable outcome.",
    suggestedKeywords: ["Grafana", "InfluxDB"],
  },
];

/**
 * Phase 3.5 mock: AI-synthesised Skills section. Each entry has a bold title
 * + a concise details line. The mock targets the user's master profile facts
 * so it produces a plausible-looking section even when AI_PROVIDER=mock.
 */
const MOCK_TAILORED_SKILLS = [
  {
    id: "embedded-software",
    title: "Embedded software",
    details:
      "Firmware on STM32 and Nordic nRF (BLE, SPI, I2C, CAN), real-time RTOS work and bench bring-up in C / C++.",
    rationale:
      "Matches the offer's top required skills (STM32 / Nordic / BLE / SPI / I2C / RTOS).",
  },
  {
    id: "industrial-iot",
    title: "Industrial IoT",
    details:
      "PLC integration, calibration tooling, telemetry pipelines with InfluxDB and Grafana dashboards.",
    rationale: "Direct match for the JD's calibration + IoT pipeline themes.",
  },
  {
    id: "full-stack-tooling",
    title: "Full-stack tooling",
    details:
      "Internal apps in TypeScript / React / Next.js, Go APIs and Docker-based deployments.",
    rationale: "Supports the JD's Docker + Python / TypeScript preferred skills.",
  },
  {
    id: "private-5g",
    title: "Private 5G",
    details:
      "Built and operated a private 5G station: SIM provisioning, throughput analysis, and link diagnostics.",
    rationale:
      "Differentiator from the candidate's research role; signals depth in connectivity.",
  },
  {
    id: "project-leadership",
    title: "Project leadership",
    details:
      "Owns features end-to-end from spec through bench debugging to deployed product.",
    rationale:
      "Mirrors the JD's 'team collaboration' and 'project leadership' emphasis.",
  },
];

export class MockProvider implements LlmProvider {
  name = "mock";
  model = "mock-1";

  async run(call: LlmCall) {
    let rawOutput = "{}";
    switch (call.promptName) {
      case "parse-job":
        rawOutput = JSON.stringify(MOCK_JOB_SIGNALS);
        break;
      case "tailor-summary":
        rawOutput = JSON.stringify({
          summary: MOCK_TAILORED_SUMMARY,
          rationale:
            "Emphasises embedded firmware on STM32/Nordic, BLE/SPI/I2C, and IoT/Docker tooling — the offer's top required and preferred signals.",
        });
        break;
      case "rewrite-bullets":
        rawOutput = JSON.stringify({ rewrites: MOCK_BULLET_REWRITES });
        break;
      case "tailor-skills":
        // Phase 3.5: AI-synthesised Skills section.
        rawOutput = JSON.stringify({ skills: MOCK_TAILORED_SKILLS });
        break;
      case "suggest-sections":
        // Recommendations are computed deterministically by `recommendBlocks`
        // in ai.ts; the prompt itself stays in the pipeline for parity.
        rawOutput = JSON.stringify({ recommendations: [] });
        break;
      default:
        throw new Error(`MockProvider: unknown prompt "${call.promptName}"`);
    }
    return { rawOutput };
  }
}
