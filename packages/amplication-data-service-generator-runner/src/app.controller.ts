import { Body, Controller, Post } from "@nestjs/common";
import { generateCode } from "./generate-code";

@Controller()
export class AppController {
  @Post("/example")
  exmaple(
    @Body("resourceId") resourceId: string,
    @Body("buildId") buildId: string,
    @Body("specPath") specPath: string,
    @Body("outputPath") outputPath: string
  ): string {
    process.env.RESOURCE_ID = resourceId;
    process.env.BUILD_ID = buildId;
    generateCode(specPath, outputPath).catch((err) => {
      console.error(err);
    });
    return "Started";
  }
}
