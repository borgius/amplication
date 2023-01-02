import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DSGResourceData } from "@amplication/code-gen-types";

import { promises as fs } from "fs";
import { copy } from "fs-extra";
import { join, dirname } from "path";
import { Env } from "../env";

@Injectable()
export class BuildRunnerService {
  constructor(private readonly configService: ConfigService<Env, true>) {}

  resourcePath(buildId: string) {
    return join(
      this.configService.get(Env.DSG_JOBS_BASE_FOLDER),
      buildId,
      this.configService.get(Env.DSG_JOBS_RESOURCE_DATA_FILE)
    );
  }

  async saveDsgResourceData(buildId: string, dsgResourceData: DSGResourceData) {
    const savePath = this.resourcePath(buildId);

    const saveDir = dirname(savePath);
    await fs.mkdir(saveDir, { recursive: true });

    await fs.writeFile(savePath, JSON.stringify(dsgResourceData));
    return savePath;
  }

  jobsPath(buildId: string) {
    return join(
      this.configService.get(Env.DSG_JOBS_BASE_FOLDER),
      buildId,
      this.configService.get(Env.DSG_JOBS_CODE_FOLDER)
    );
  }

  artifactPath(resourceId: string, buildId: string) {
    return join(
      this.configService.get(Env.BUILD_ARTIFACTS_BASE_FOLDER),
      resourceId,
      buildId
    );
  }

  async copyFromJobToArtifact(resourceId: string, buildId: string) {
    const jobPath = this.jobsPath(buildId);
    const artifactPath = this.artifactPath(resourceId, buildId);

    await copy(jobPath, artifactPath);
    return artifactPath;
  }
}
