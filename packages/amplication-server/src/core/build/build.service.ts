import { join } from "path";
import { Inject, Injectable, forwardRef } from "@nestjs/common";
import axios from "axios";
import { existsSync, promises as fs } from "fs";
import { ConfigService } from "@nestjs/config";
import { simpleGit, SimpleGit } from "simple-git";
import { Prisma, PrismaService } from "../../prisma";
import { orderBy } from "lodash";
import * as CodeGenTypes from "@amplication/code-gen-types";
import { ResourceRole, User } from "../../models";
import { Build } from "./dto/Build";
import { CreateBuildArgs } from "./dto/CreateBuildArgs";
import { FindManyBuildArgs } from "./dto/FindManyBuildArgs";
import { EnumBuildStatus } from "./dto/EnumBuildStatus";
import { FindOneBuildArgs } from "./dto/FindOneBuildArgs";
import { EntityService } from "../entity/entity.service";
import { ResourceRoleService } from "../resourceRole/resourceRole.service";
import { ResourceService } from "../resource/resource.service";
import {
  EnumActionStepStatus,
  EnumActionLogLevel,
  ActionStep,
} from "../action/dto";
import { UserService } from "../user/user.service";
import { ServiceSettingsService } from "../serviceSettings/serviceSettings.service";
import { ActionService } from "../action/action.service";
import { QueueService } from "../queue/queue.service";
import { CanUserAccessArgs } from "./dto/CanUserAccessArgs";
import { TopicService } from "../topic/topic.service";
import { ServiceTopicsService } from "../serviceTopics/serviceTopics.service";
import { PluginInstallationService } from "../pluginInstallation/pluginInstallation.service";
import { EnumResourceType } from "../resource/dto/EnumResourceType";
import { Env } from "../../env";
import {
  AmplicationLogger,
  AMPLICATION_LOGGER_PROVIDER,
} from "@amplication/nest-logger-module";
import { BillingService } from "../billing/billing.service";
import { ProjectConfigurationSettingsService } from "../projectConfigurationSettings/projectConfigurationSettings.service";

export const HOST_VAR = "HOST";
export const CLIENT_HOST_VAR = "CLIENT_HOST";
export const GENERATE_STEP_MESSAGE = "Generating Application";
export const GENERATE_STEP_NAME = "GENERATE_APPLICATION";
export const BUILD_DOCKER_IMAGE_STEP_MESSAGE = "Building Docker image";
export const BUILD_DOCKER_IMAGE_STEP_NAME = "BUILD_DOCKER";
export const BUILD_DOCKER_IMAGE_STEP_FINISH_LOG =
  "Built Docker image successfully";
export const BUILD_DOCKER_IMAGE_STEP_FAILED_LOG = "Build Docker failed";
export const BUILD_DOCKER_IMAGE_STEP_RUNNING_LOG =
  "Waiting for Docker image...";
export const BUILD_DOCKER_IMAGE_STEP_START_LOG =
  "Starting to build Docker image. It should take a few minutes.";

export const PUSH_TO_GITHUB_STEP_NAME = "PUSH_TO_GITHUB";
export const PUSH_TO_GITHUB_STEP_MESSAGE = "Push changes to GitHub";
export const PUSH_TO_GITHUB_STEP_START_LOG =
  "Starting to push changes to GitHub.";
export const PUSH_TO_GITHUB_STEP_FINISH_LOG =
  "Successfully pushed changes to GitHub";
export const PUSH_TO_GITHUB_STEP_FAILED_LOG = "Push changes to GitHub failed";

export const ACTION_ZIP_LOG = "Creating ZIP file";
export const ACTION_JOB_DONE_LOG = "Build job done";
export const JOB_STARTED_LOG = "Build job started";
export const JOB_DONE_LOG = "Build job done";
export const ENTITIES_INCLUDE = {
  fields: true,
  permissions: {
    include: {
      permissionRoles: {
        include: {
          resourceRole: true,
        },
      },
      permissionFields: {
        include: {
          field: true,
          permissionRoles: {
            include: {
              resourceRole: true,
            },
          },
        },
      },
    },
  },
};
export const ACTION_INCLUDE = {
  action: {
    include: {
      steps: true,
    },
  },
};

export const ACTION_LOG_LEVEL: {
  [level: string]: EnumActionLogLevel;
} = {
  error: EnumActionLogLevel.Error,
  warn: EnumActionLogLevel.Warning,
  info: EnumActionLogLevel.Info,
  debug: EnumActionLogLevel.Debug,
};

export function createInitialStepData(
  version: string,
  message: string
): Prisma.ActionStepCreateWithoutActionInput {
  return {
    message: "Adding task to queue",
    name: "ADD_TO_QUEUE",
    status: EnumActionStepStatus.Success,
    completedAt: new Date(),
    logs: {
      create: [
        {
          level: EnumActionLogLevel.Info,
          message: "create build generation task",
          meta: {},
        },
        {
          level: EnumActionLogLevel.Info,
          message: `Build Version: ${version}`,
          meta: {},
        },
        {
          level: EnumActionLogLevel.Info,
          message: `Build message: ${message}`,
          meta: {},
        },
      ],
    },
  };
}
type BuildData = {
  build: Build;
  user: User;
  dsgResourceData: CodeGenTypes.DSGResourceData & { currentBrach?: string };
  dsgRunnerUrl: string;
  ampBranch: string;
  artifacts: string;
  dsgFile: string;
};

@Injectable()
export class BuildService {
  private readonly isBillingEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly entityService: EntityService,
    private readonly resourceRoleService: ResourceRoleService,
    private readonly actionService: ActionService,
    @Inject(forwardRef(() => ResourceService))
    private readonly resourceService: ResourceService,
    private readonly projectConfiguration: ProjectConfigurationSettingsService,
    private readonly serviceSettingsService: ServiceSettingsService,
    private readonly userService: UserService,
    private readonly queueService: QueueService,
    private readonly topicService: TopicService,
    private readonly serviceTopicsService: ServiceTopicsService,
    private readonly pluginInstallationService: PluginInstallationService,
    private readonly billingService: BillingService,

    @Inject(AMPLICATION_LOGGER_PROVIDER)
    private readonly logger: AmplicationLogger
  ) {
    this.host = this.configService.get(HOST_VAR);
    if (!this.host) {
      throw new Error("Missing HOST_VAR in env");
    }

    this.isBillingEnabled = this.configService.get<boolean>(
      Env.BILLING_ENABLED
    );
  }
  host: string;

  /**
   * create function creates a new build for given resource in the DB
   * @returns the build object that return after prisma.build.create
   */
  async create(args: CreateBuildArgs, skipPublish?: boolean): Promise<Build> {
    const resourceId = args.data.resource.connect.id;
    const user = await this.userService.findUser({
      where: {
        id: args.data.createdBy.connect.id,
      },
    });

    //TODO
    /**@todo: set version based on release when applicable */
    const commitId = args.data.commit.connect.id;
    const version = commitId.slice(commitId.length - 8);

    const latestEntityVersions = await this.entityService.getLatestVersions({
      where: { resource: { id: resourceId } },
    });

    const build = await this.prisma.build.create({
      ...args,
      data: {
        ...args.data,
        version,
        createdAt: new Date(),
        blockVersions: {
          connect: [],
        },
        entityVersions: {
          connect: latestEntityVersions.map((version) => ({ id: version.id })),
        },
        action: {
          create: {
            steps: {
              create: createInitialStepData(version, args.data.message),
            },
          }, //create action record
        },
      },
      include: {
        commit: true,
        resource: true,
      },
    });

    const logger = this.logger.child({
      buildId: build.id,
    });

    const resource = await this.resourceService.findOne({
      where: { id: resourceId },
    });
    if (resource.resourceType !== EnumResourceType.Service) {
      logger.info("Code generation is supported only for services");
      return;
    }

    logger.info(JOB_STARTED_LOG);
    await this.generate(build, user);

    return build;
  }

  async findMany(args: FindManyBuildArgs): Promise<Build[]> {
    return this.prisma.build.findMany(args);
  }

  async findOne(args: FindOneBuildArgs): Promise<Build | null> {
    return this.prisma.build.findUnique(args);
  }

  async getGenerateCodeStep(buildId: string): Promise<ActionStep | undefined> {
    const [generateStep] = await this.prisma.build
      .findUnique({
        where: {
          id: buildId,
        },
      })
      .action()
      .steps({
        where: {
          name: GENERATE_STEP_NAME,
        },
      });

    return generateStep;
  }

  async calcBuildStatus(buildId: string): Promise<EnumBuildStatus> {
    const build = await this.prisma.build.findUnique({
      where: {
        id: buildId,
      },
      include: ACTION_INCLUDE,
    });

    if (!build.action?.steps?.length) return EnumBuildStatus.Invalid;
    const steps = build.action.steps;

    if (steps.every((step) => step.status === EnumActionStepStatus.Success))
      return EnumBuildStatus.Completed;

    if (steps.some((step) => step.status === EnumActionStepStatus.Failed))
      return EnumBuildStatus.Failed;

    return EnumBuildStatus.Running;
  }

  async completeCodeGenerationStep(
    buildId: string,
    status: EnumActionStepStatus.Success | EnumActionStepStatus.Failed
  ): Promise<void> {
    const step = await this.getGenerateCodeStep(buildId);
    if (!step) {
      throw new Error("Could not find generate code step");
    }
    const { build, ampBranch, artifacts, dsgFile } = await this.getBuildData(
      buildId,
      step
    );
    const dsgContext = JSON.parse((await fs.readFile(dsgFile)).toString());
    const lastBranch = dsgContext.currentBrach;

    const git: SimpleGit = simpleGit(artifacts);

    if (status === EnumActionStepStatus.Success) {
      // await git.add(".");
      // await git.commit(build.message || "Update Entities", ["--no-verify"]);
      // await git.checkout(lastBranch);
      // await git.merge([ampBranch]);
    } else {
      //
    }
    await this.actionService.complete(step, status);
  }

  private async getBuildData(
    buildId: string,
    step: ActionStep
  ): Promise<BuildData> {
    const build = await this.findOne({ where: { id: buildId } });
    const { resourceId, userId, version: buildVersion } = build;
    const user = await this.userService.findUser({ where: { id: userId } });
    const dsgResourceData = await this.getDSGResourceData(
      resourceId,
      buildId,
      buildVersion,
      user
    );
    const projectConfig = await this.projectConfiguration.findOne({
      where: { id: dsgResourceData.otherResources[0].resourceInfo.id },
    });
    const dsgRunnerUrl = this.configService.get(Env.DSG_RUNNER_URL);

    const ampBranch = this.configService.get(Env.AMP_BRANCH, "amplication");
    const artifacts = join(
      this.configService.get(Env.BUILD_ARTIFACTS_FOLDER),
      projectConfig.baseDirectory
    );
    const dsgFile = `${artifacts}/.${ampBranch}.json`;

    return {
      build,
      user,
      dsgResourceData,
      dsgRunnerUrl,
      ampBranch,
      artifacts,
      dsgFile,
    };
  }
  /**
   * Generates code for given build and saves it to storage
   * @DSG The connection between the server and the DSG (Data Service Generator)
   * @param build the build object to generate code for
   * @param user the user that triggered the build
   */
  private async generate(build: Build, user: User): Promise<string> {
    return this.actionService.run(
      build.actionId,
      GENERATE_STEP_NAME,
      GENERATE_STEP_MESSAGE,
      async (step) => {
        const logger = this.logger.child({ buildId: build.id });

        logger.info("Preparing build generation message");
        const { dsgResourceData, dsgRunnerUrl, ampBranch, artifacts, dsgFile } =
          await this.getBuildData(build.id, step);

        logger.info("Writing build generation message to queue");

        try {
          if (!existsSync(artifacts))
            throw `Artifact folder not exists. It should be initialized git project. (${artifacts})`;
          const git: SimpleGit = simpleGit(artifacts);
          const gitStatus = await git.status();
          // if (!gitStatus.isClean())
          //   throw `Git status is not clear at destination folder: ${artifacts}`;

          // status.current
          const { branches } = await git.branchLocal();
          if (branches[ampBranch]) {
            await git.checkout(ampBranch);
          } else {
            await git.checkoutLocalBranch(ampBranch);
          }
          dsgResourceData.currentBrach = gitStatus.current;

          await fs.writeFile(dsgFile, JSON.stringify(dsgResourceData, null, 2));
          await axios.post(dsgRunnerUrl, {
            resourceId: build.resourceId,
            buildId: build.id,
            specPath: dsgFile,
            outputPath: artifacts,
          });
        } catch (error) {
          const msg = error.message || error;
          logger.info(msg);
          await this.actionService.logByStepId(
            step.id,
            ACTION_LOG_LEVEL.error,
            msg
          );
          await this.completeCodeGenerationStep(
            build.id,
            EnumActionStepStatus.Failed
          );
        }
        return null;
      },
      true
    );
  }

  private async getResourceRoles(resourceId: string): Promise<ResourceRole[]> {
    return this.resourceRoleService.getResourceRoles({
      where: {
        resource: {
          id: resourceId,
        },
      },
    });
  }

  /**
   *
   * @info this function must always return the entities in the same order to prevent unintended code changes
   * @returns all the entities for build order by date of creation
   */
  private async getOrderedEntities(
    buildId: string
  ): Promise<CodeGenTypes.Entity[]> {
    const entities = await this.entityService.getEntitiesByVersions({
      where: {
        builds: {
          some: {
            id: buildId,
          },
        },
      },
      include: ENTITIES_INCLUDE,
    });
    return orderBy(
      entities,
      (entity) => entity.createdAt
    ) as unknown as CodeGenTypes.Entity[];
  }
  async canUserAccess({
    userId,
    buildId,
  }: CanUserAccessArgs): Promise<boolean> {
    const build = this.prisma.build.findFirst({
      // eslint-disable-next-line @typescript-eslint/naming-convention
      where: { id: buildId, AND: { userId } },
    });
    return Boolean(build);
  }

  async getDSGResourceData(
    resourceId: string,
    buildId: string,
    buildVersion: string,
    user: User,
    rootGeneration = true
  ): Promise<CodeGenTypes.DSGResourceData> {
    const resources = await this.resourceService.resources({
      where: {
        project: { resources: { some: { id: resourceId } } },
      },
    });

    const resource = resources.find(({ id }) => id === resourceId);

    const allPlugins = await this.pluginInstallationService.findMany({
      where: { resource: { id: resourceId } },
    });
    const plugins = allPlugins.filter((plugin) => plugin.enabled);
    const url = `${this.host}/${resourceId}`;

    const serviceSettings =
      resource.resourceType === EnumResourceType.Service
        ? await this.serviceSettingsService.getServiceSettingsValues(
            {
              where: { id: resourceId },
            },
            user
          )
        : undefined;

    const otherResources = rootGeneration
      ? await Promise.all(
          resources
            .filter(({ id }) => id !== resourceId)
            .map((resource) =>
              this.getDSGResourceData(
                resource.id,
                buildId,
                buildVersion,
                user,
                false
              )
            )
        )
      : undefined;

    return {
      entities: await this.getOrderedEntities(buildId),
      roles: await this.getResourceRoles(resourceId),
      pluginInstallations: plugins,
      resourceType: resource.resourceType,
      topics: await this.topicService.findMany({
        where: { resource: { id: resourceId } },
      }),
      serviceTopics: await this.serviceTopicsService.findMany({
        where: { resource: { id: resourceId } },
      }),
      resourceInfo: {
        name: resource.name,
        description: resource.description,
        version: buildVersion,
        id: resourceId,
        url,
        settings: serviceSettings,
      },
      otherResources,
    };
  }
}
