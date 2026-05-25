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

const MOCK_BULLET_REWRITES = [
  {
    targetId: "hes-so-research-assistant#0",
    original:
      "Built calibration tooling and APIs in Go and C++/Qt for industrial PLC deployments.",
    suggested:
      "Designed calibration tooling and APIs in Go and C++/Qt to support industrial PLC deployments and bench-level validation.",
    rationale:
      "Lead with 'Designed' to mirror the offer's 'design and ship firmware' framing; keep all underlying tools and scope unchanged.",
  },
  {
    targetId: "hes-so-research-assistant#1",
    original:
      "Designed and deployed a private 5G station, handling SIM provisioning and performance analysis.",
    suggested:
      "Brought up and deployed a private 5G station end-to-end, including SIM provisioning and performance analysis.",
    rationale:
      "Echoes 'bring up new boards' language from the JD without inventing any new responsibility.",
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
