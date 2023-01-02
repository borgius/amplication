import { generateCode } from "./generate-code";

const buildSpecPath = process.env.BUILD_SPEC_PATH;
const buildOutputPath = process.env.BUILD_OUTPUT_PATH;

if (!buildSpecPath) {
  throw new Error("SOURCE is not defined");
}
if (!buildOutputPath) {
  throw new Error("DESTINATION is not defined");
}

generateCode(buildSpecPath, buildOutputPath).catch((err) => {
  console.error(err);
  process.exit(1);
});
