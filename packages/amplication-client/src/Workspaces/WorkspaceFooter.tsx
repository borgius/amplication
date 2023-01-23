import { Icon, SkeletonWrapper } from "@amplication/design-system";
import { isEmpty } from "lodash";
import React, { useContext, useMemo } from "react";
import { Link } from "react-router-dom";
import { ClickableId } from "../Components/ClickableId";
import { AppContext } from "../context/appContext";
import GitRepoDetails from "../Resource/git/GitRepoDetails";
import { AnalyticsEventNames } from "../util/analytics-events.types";
import { PUSH_TO_GITHUB_STEP_NAME } from "../VersionControl/BuildSteps";
import useCommit from "../VersionControl/hooks/useCommits";
import "./WorkspaceFooter.scss";

const CLASS_NAME = "workspace-footer";

const WorkspaceFooter: React.FC<unknown> = () => {
  const {
    currentWorkspace,
    currentProject,
    currentResource,
    commitRunning,
    gitRepositoryFullName,
    gitRepositoryUrl,
    projectConfigurationResource,
  } = useContext(AppContext);

  const { lastCommit } = useCommit();

  const lastResourceBuild = useMemo(() => {
    if (!lastCommit) return null;
    if (lastCommit.builds && currentResource?.id) {
      return lastCommit.builds.find(
        (lastCommitBuild) => lastCommitBuild.resourceId === currentResource.id
      );
    }
  }, [currentResource?.id, lastCommit]);

  const ClickableCommitId = lastCommit && (
    <ClickableId
      to={`/${currentWorkspace?.id}/${currentProject?.id}/commits/${lastCommit.id}`}
      id={lastCommit.id}
      label="Commit ID"
      eventData={{
        eventName: AnalyticsEventNames.LastCommitIdClick,
      }}
    />
  );

  const ClickableBuildId = lastResourceBuild && (
    <ClickableId
      label="Build ID"
      to={`/${currentWorkspace?.id}/${currentProject?.id}/${lastResourceBuild.resourceId}/builds/${lastResourceBuild.id}`}
      id={lastResourceBuild.id}
      eventData={{
        eventName: AnalyticsEventNames.LastBuildIdClick,
      }}
    />
  );

  const githubUrl = useMemo(() => {
    if (!lastResourceBuild?.action?.steps?.length) {
      return gitRepositoryUrl;
    }
    const stepGithub = lastResourceBuild?.action.steps.find(
      (step) => step.name === PUSH_TO_GITHUB_STEP_NAME
    );

    const log = stepGithub?.logs?.find(
      (log) => !isEmpty(log.meta) && !isEmpty(log.meta.githubUrl)
    );
    // if there is "lastResourceBuild" link to the last PR
    return lastResourceBuild ? log?.meta?.githubUrl : gitRepositoryUrl;
  }, [gitRepositoryUrl, lastResourceBuild]);

  return (
    <div className={CLASS_NAME}>
      <div className={`${CLASS_NAME}__left`}></div>
      <div className={`${CLASS_NAME}__right`}>
        <SkeletonWrapper
          showSkeleton={commitRunning}
          className={`${CLASS_NAME}__skeleton`}
        >
          <span className={`${CLASS_NAME}__commit-id`}>
            {ClickableCommitId}
          </span>
          {lastResourceBuild && (
            <hr className={`${CLASS_NAME}__vertical_border`} />
          )}
          <span className={`${CLASS_NAME}__build-id`}>{ClickableBuildId}</span>
        </SkeletonWrapper>
      </div>
    </div>
  );
};

export default WorkspaceFooter;
