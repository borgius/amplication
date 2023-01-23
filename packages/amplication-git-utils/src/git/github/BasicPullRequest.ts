import { Changes } from "octokit-plugin-create-pull-request/dist-types/types";
import { BasePullRequest } from "./BasePullRequest";

export class BasicPullRequest extends BasePullRequest {
  async createPullRequest(
    prTitle: string,
    prBody: string,
    head: string,
    files: Required<Changes["files"]>,
    commitMessage: string
  ): Promise<string> {
    const { octokit, owner, repo } = this;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const pr = await octokit.createPullRequest({
      owner,
      repo,
      title: prTitle,
      body: prBody,
      head,
      update: true,
      changes: [
        {
          /* optional: if `files` is not passed, an empty commit is created instead */
          files: files,
          commit: commitMessage,
        },
      ],
    });
    return pr.data.html_url;
  }
}
