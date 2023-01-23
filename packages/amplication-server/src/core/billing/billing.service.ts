/* eslint-disable @typescript-eslint/no-empty-function */
import {
  AmplicationLogger,
  AMPLICATION_LOGGER_PROVIDER,
} from "@amplication/nest-logger-module";
import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stigg, {
  BooleanEntitlement,
  MeteredEntitlement,
  NumericEntitlement,
  ProvisionSubscriptionResult,
  ReportUsageAck,
} from "@stigg/node-server-sdk";
import {
  BillingPeriod,
  SubscriptionStatus,
} from "@stigg/node-server-sdk/dist/api/generated/types";
import { EnumSubscriptionPlan, SubscriptionData } from "../subscription/dto";
import { EnumSubscriptionStatus } from "../subscription/dto/EnumSubscriptionStatus";
import { Subscription } from "../subscription/dto/Subscription";
import { BillingFeature } from "./BillingFeature";
import { BillingPlan } from "./BillingPlan";
import { SegmentAnalyticsService } from "../../services/segmentAnalytics/segmentAnalytics.service";
import { ValidationError } from "../../errors/ValidationError";
import { FeatureUsageReport } from "../project/FeatureUsageReport";
import { ProvisionSubscriptionInput } from "../workspace/dto/ProvisionSubscriptionInput";

@Injectable()
export class BillingService {
  private readonly stiggClient: Stigg;
  private readonly clientHost: string;
  private billingEnabled: boolean;

  get isBillingEnabled(): boolean {
    return this.billingEnabled;
  }

  constructor(
    @Inject(AMPLICATION_LOGGER_PROVIDER)
    private readonly logger: AmplicationLogger,
    private readonly analytics: SegmentAnalyticsService,
    configService: ConfigService
  ) {}

  async getStiggClient() {
    return {
      async provisionCustomer(cust) {},
    };
  }

  async reportUsage(
    workspaceId: string,
    feature: BillingFeature,
    value = 1
  ): Promise<ReportUsageAck> {
    return { measurementId: "" };
  }

  async setUsage(
    workspaceId: string,
    feature: BillingFeature,
    value: number
  ): Promise<Partial<ReportUsageAck>> {
    return {};
  }

  async getMeteredEntitlement(
    workspaceId: string,
    feature: BillingFeature
  ): Promise<Partial<MeteredEntitlement>> {
    return {
      hasAccess: true,
      usageLimit: 10000,
    };
  }

  async getNumericEntitlement(
    workspaceId: string,
    feature: BillingFeature
  ): Promise<Partial<NumericEntitlement>> {
    return {};
  }

  async getBooleanEntitlement(
    workspaceId: string,
    feature: BillingFeature
  ): Promise<Partial<BooleanEntitlement>> {
    return {};
  }

  async provisionSubscription({
    workspaceId,
    planId,
    billingPeriod,
    intentionType,
    cancelUrl,
    successUrl,
    userId,
  }: ProvisionSubscriptionInput & {
    userId: string;
  }): Promise<Partial<ProvisionSubscriptionResult>> {
    return {};
  }

  async getSubscription(
    workspaceId: string
  ): Promise<Partial<Subscription> | null> {
    return {
      id: "Enterprise",
      status: EnumSubscriptionStatus.Active,
      workspaceId: workspaceId,
      subscriptionPlan: EnumSubscriptionPlan.Enterprise,
      createdAt: new Date(),
      updatedAt: new Date(),
      subscriptionData: new SubscriptionData(),
    };
  }

  async provisionCustomer(
    workspaceId: string,
    plan: BillingPlan
  ): Promise<null> {
    if (this.isBillingEnabled) {
      const stiggClient = await this.getStiggClient();
      await stiggClient.provisionCustomer({
        customerId: workspaceId,
        subscriptionParams: {
          planId: plan,
        },
      });
    }
    return;
  }

  //todo: wrap with a try catch and return an object with the details about the limitations
  async validateSubscriptionPlanLimitationsForWorkspace(
    workspaceId: string
  ): Promise<void> {
    if (this.isBillingEnabled) {
      const isIgnoreValidationCodeGeneration = await this.getBooleanEntitlement(
        workspaceId,
        BillingFeature.IgnoreValidationCodeGeneration
      );

      //check whether the workspace has entitlement to bypass code generation limitation
      if (!isIgnoreValidationCodeGeneration.hasAccess) {
        const servicesEntitlement = await this.getMeteredEntitlement(
          workspaceId,
          BillingFeature.Services
        );

        if (!servicesEntitlement.hasAccess) {
          throw new ValidationError(
            `LimitationError: Allowed services per workspace: ${servicesEntitlement.usageLimit}`
          );
        }

        const servicesAboveEntitiesPerServiceLimitEntitlement =
          await this.getMeteredEntitlement(
            workspaceId,
            BillingFeature.ServicesAboveEntitiesPerServiceLimit
          );

        if (!servicesAboveEntitiesPerServiceLimitEntitlement.hasAccess) {
          const entitiesPerServiceEntitlement =
            await this.getNumericEntitlement(
              workspaceId,
              BillingFeature.EntitiesPerService
            );

          const entitiesPerServiceLimit = entitiesPerServiceEntitlement.value;

          throw new ValidationError(
            `LimitationError: Allowed entities per service: ${entitiesPerServiceLimit}`
          );
        }
      }
    }
  }

  async resetUsage(workspaceId: string, currentUsage: FeatureUsageReport) {
    if (this.isBillingEnabled) {
      await this.setUsage(
        workspaceId,
        BillingFeature.Services,
        currentUsage.services
      );

      await this.setUsage(
        workspaceId,
        BillingFeature.ServicesAboveEntitiesPerServiceLimit,
        currentUsage.servicesAboveEntityPerServiceLimit
      );
    }
  }

  mapSubscriptionStatus(status: SubscriptionStatus): EnumSubscriptionStatus {
    switch (status) {
      case SubscriptionStatus.Active:
        return EnumSubscriptionStatus.Active;
      case SubscriptionStatus.Canceled:
        return EnumSubscriptionStatus.Deleted;
      case SubscriptionStatus.Expired:
        return EnumSubscriptionStatus.PastDue;
      case SubscriptionStatus.InTrial:
        return EnumSubscriptionStatus.Trailing;
      case SubscriptionStatus.NotStarted:
        return EnumSubscriptionStatus.Paused;
      case SubscriptionStatus.PaymentPending:
        return EnumSubscriptionStatus.Paused;
      default:
        throw new Error(`Unknown subscription status: ${status}`);
    }
  }

  mapSubscriptionPlan(planId: BillingPlan): EnumSubscriptionPlan {
    switch (planId) {
      case BillingPlan.Pro:
        return EnumSubscriptionPlan.Pro;
      case BillingPlan.Enterprise:
        return EnumSubscriptionPlan.Enterprise;
      default:
        throw new Error(`Unknown plan id: ${planId}`);
    }
  }
}
