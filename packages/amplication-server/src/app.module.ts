import { ApolloDriverConfig, ApolloDriver } from "@nestjs/apollo";
import { Module, OnApplicationShutdown } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { GraphQLModule } from "@nestjs/graphql";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MorganModule } from "nest-morgan";
import { Request } from "express";
import { CoreModule } from "./core/core.module";
import { InjectContextInterceptor } from "./interceptors/inject-context.interceptor";
import { SegmentAnalyticsModule } from "./services/segmentAnalytics/segmentAnalytics.module";
import { SegmentAnalyticsOptionsService } from "./services/segmentAnalytics/segmentAnalyticsOptionsService";
import { SendGridModule } from "@ntegral/nestjs-sendgrid";
import { SendgridConfigService } from "./services/sendgridConfig.service";
import { GoogleSecretsManagerModule } from "./services/googleSecretsManager.module";
import { GoogleSecretsManagerService } from "./services/googleSecretsManager.service";
import { HealthModule } from "./core/health/health.module";
import { join } from "path";
import { AmplicationLoggerModule } from "@amplication/nest-logger-module";
import { SERVICE_NAME } from "./constants";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
    }),
    SendGridModule.forRootAsync({
      imports: [ConfigModule, GoogleSecretsManagerModule],
      inject: [ConfigService, GoogleSecretsManagerService],
      useClass: SendgridConfigService,
    }),

    AmplicationLoggerModule.register({
      metadata: { service: SERVICE_NAME },
    }),

    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      useFactory: async (configService: ConfigService) => {
        return {
          autoSchemaFile:
            configService.get("GRAPHQL_SCHEMA_DEST") ||
            join(process.cwd(), "src", "schema.graphql"),
          debug: configService.get("GRAPHQL_DEBUG") === "1",
          playground: configService.get("PLAYGROUND_ENABLE") === "1",
          context: ({ req }: { req: Request }) => ({
            req,
          }),
        };
      },
      inject: [ConfigService],
    }),

    MorganModule,
    SegmentAnalyticsModule.registerAsync({
      useClass: SegmentAnalyticsOptionsService,
    }),
    HealthModule,
    CoreModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: InjectContextInterceptor,
    },
  ],
})
export class AppModule implements OnApplicationShutdown {
  onApplicationShutdown(signal: string): void {
    console.trace(`Application shut down (signal: ${signal})`);
  }
}
