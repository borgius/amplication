/* eslint-disable @typescript-eslint/no-empty-function */
import {
  AmplicationLogger,
  AMPLICATION_LOGGER_PROVIDER,
} from "@amplication/nest-logger-module";
import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stigg, {
  BillingPeriod,
  BooleanEntitlement,
  MeteredEntitlement,
  NumericEntitlement,
  ProvisionSubscriptionResult,
  ReportUsageAck,
} from "@stigg/node-server-sdk";
import { SubscriptionStatus } from "@stigg/node-server-sdk/dist/api/generated/types";
import { EnumSubscriptionPlan, SubscriptionData } from "../subscription/dto";
import { EnumSubscriptionStatus } from "../subscription/dto/EnumSubscriptionStatus";
import { Subscription } from "../subscription/dto/Subscription";
import { BillingFeature } from "./BillingFeature";
import { BillingPlan } from "./BillingPlan";
import { SegmentAnalyticsService } from "../../services/segmentAnalytics/segmentAnalytics.service";

@Injectable()
export class BillingService {
  private readonly stiggClient: Stigg;
  private readonly clientHost: string;

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

  async provisionSubscription(
    workspaceId: string,
    planId: string,
    billingPeriod: BillingPeriod,
    intentionType: "UPGRADE_PLAN" | "DOWNGRADE_PLAN",
    cancelUrl: string,
    successUrl: string
  ): Promise<Partial<ProvisionSubscriptionResult>> {
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
