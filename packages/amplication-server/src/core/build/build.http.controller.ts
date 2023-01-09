import { Controller, Post } from "@nestjs/common";
import { BuildService } from "./build.service";
import { Payload } from "@nestjs/microservices";
import { CodeGenerationSuccess } from "./dto/CodeGenerationSuccess";
import { EnumActionStepStatus } from "../action/dto";
import { ActionService } from "../action/action.service";
import { CodeGenerationFailure } from "./dto/CodeGenerationFailure";

@Controller("build-runner")
export class BuildHttpController {
  constructor(
    private readonly buildService: BuildService,
    private readonly actionService: ActionService
  ) {}

  @Post("code-generation-success")
  async onCodeGenerationSuccess(
    @Payload() dto: CodeGenerationSuccess
  ): Promise<void> {
    await this.buildService.completeCodeGenerationStep(
      dto.buildId,
      EnumActionStepStatus.Success
    );
  }

  @Post("code-generation-failure")
  async onCodeGenerationFailure(
    @Payload() dto: CodeGenerationFailure
  ): Promise<void> {
    await this.buildService.completeCodeGenerationStep(
      dto.buildId,
      EnumActionStepStatus.Failed
    );
  }
}
