import { AMPLICATION_MODULES } from "./constants";
import { DSGResourceData, Module } from "@amplication/code-gen-types";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { createDataService } from "./create-data-service";
import { dynamicPackagesInstallations } from "./dynamic-package-installation";
import { defaultLogger } from "./server/logging";
import { prepareDefaultPlugins } from "./utils/dynamic-installation/defaultPlugins";
import { httpClient } from "./utils/http-client";

export const readInputJson = async (
  filePath: string
): Promise<DSGResourceData> => {
  const file = readFileSync(filePath, "utf8");
  const resourceData: DSGResourceData = JSON.parse(file);
  return resourceData;
};

export const writeModules = async (
  modules: Module[],
  destination: string
): Promise<void> => {
  console.log("Creating base directory");
  mkdirSync(destination, { recursive: true });
  console.info(`Writing modules to ${destination} ...`);
  modules.forEach((module) => {
    const filePath = join(destination, module.path);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, module.code);
  });

  console.info(`Successfully wrote modules to ${destination}`);
};

export const generateCode = async (
  source: string,
  destination: string
): Promise<void> => {
  try {
    const resourceData = await readInputJson(source);
    const { pluginInstallations } = resourceData;

    const allPlugins = prepareDefaultPlugins(pluginInstallations);

    await dynamicPackagesInstallations(allPlugins, defaultLogger);

    const modules = await createDataService(
      { ...resourceData, pluginInstallations: allPlugins },
      defaultLogger,
      join(__dirname, "..", AMPLICATION_MODULES)
    );

    await writeModules(modules, destination);
    console.log("Code generation completed successfully");
    await httpClient.post(
      new URL(
        "build-runner/code-generation-success",
        process.env.BUILD_MANAGER_URL
      ).href,
      {
        resourceId: process.env.RESOURCE_ID,
        buildId: process.env.BUILD_ID,
      }
    );
  } catch (err) {
    console.error(err);
    await httpClient.post(
      new URL(
        "build-runner/code-generation-failure",
        process.env.BUILD_MANAGER_URL
      ).href,
      {
        resourceId: process.env.RESOURCE_ID,
        buildId: process.env.BUILD_ID,
      }
    );
  }
};
