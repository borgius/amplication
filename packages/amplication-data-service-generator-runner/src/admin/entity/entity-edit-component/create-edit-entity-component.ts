import * as path from "path";
import { builders } from "ast-types";
import { Entity } from "@amplication/code-gen-types";
import {
  addImports,
  importContainedIdentifiers,
  importNames,
  interpolate,
} from "../../../utils/ast";
import { relativeImportPath } from "../../../utils/module";
import { readFile } from "@amplication/code-gen-utils";
import { EntityComponent } from "../../types";

import {
  REACT_ADMIN_MODULE,
  REACT_ADMIN_COMPONENTS_ID,
} from "../react-admin.util";
const IMPORTABLE_IDS = {
  "../../user/RolesOptions": [builders.identifier("ROLES_OPTIONS")],
  [REACT_ADMIN_MODULE]: REACT_ADMIN_COMPONENTS_ID,
};
const template = path.resolve(__dirname, "entity-edit-component.template.tsx");

export async function createEditEntityComponent(
  entity: Entity,
  entityToDirectory: Record<string, string>,
  entityToTitleComponent: Record<string, EntityComponent>
): Promise<EntityComponent> {
  const name = `${entity.name}Edit`;
  const formName = `${entity.name}Form`;
  const modulePath = `${entityToDirectory[entity.name]}/${name}.tsx`;

  const file = await readFile(template);

  interpolate(file, {
    COMPONENT_NAME: builders.identifier(name),
    COMPONENT_FORM: builders.identifier(formName),
  });

  addImports(file, [
    importNames([builders.identifier(formName)], `./${formName}`),
  ]);

  addImports(file, [...importContainedIdentifiers(file, IMPORTABLE_IDS)]);

  return { name, file, modulePath };
}
