import { print } from "@amplication/code-gen-utils";
import { EnumAuthProviderType } from "../../../models";
import { Module } from "@amplication/code-gen-types";
import { removeTSIgnoreComments } from "../../../util/ast";
import { readFile } from "@amplication/code-gen-utils";

export async function createTokenService(
  authDir: string,
  authProvider: EnumAuthProviderType
): Promise<Module> {
  const name =
    authProvider === EnumAuthProviderType.Http ? "Basic" : authProvider;
  const templatePath = require.resolve(
    `./${name.toLowerCase()}Token.service.template.ts`
  );
  const file = await readFile(templatePath);
  const filePath = `${authDir}/base/token.service.base.ts`;

  removeTSIgnoreComments(file);

  return { code: print(file).code, path: filePath };
}
