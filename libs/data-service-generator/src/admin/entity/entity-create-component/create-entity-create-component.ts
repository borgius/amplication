import { builders, namedTypes } from "ast-types";
import { isEmpty } from "lodash";
import * as path from "path";
import {
  Entity,
  EntityField,
  EnumDataType,
  LookupResolvedProperties,
} from "@amplication/code-gen-types";
import {
  addImports,
  importContainedIdentifiers,
  importNames,
  interpolate,
} from "../../../util/ast";
import { relativeImportPath } from "../../../util/module";
import { EntityComponent } from "../../types";
import { jsxFragment } from "../../util";
import { createFieldInput } from "../create-field-input";
import {
  REACT_ADMIN_COMPONENTS_ID,
  REACT_ADMIN_MODULE,
} from "../react-admin.util";
import DsgContext from "../../../dsg-context";
import { readFile } from "@amplication/code-gen-utils";
const template = path.resolve(
  __dirname,
  "entity-create-component.template.tsx"
);

const IMPORTABLE_IDS = {
  "../../user/RolesOptions": [builders.identifier("ROLES_OPTIONS")],
  [REACT_ADMIN_MODULE]: REACT_ADMIN_COMPONENTS_ID,
};

export async function createEntityCreateComponent(
  entity: Entity,
  entityToDirectory: Record<string, string>,
  entityToTitleComponent: Record<string, EntityComponent>
): Promise<EntityComponent> {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const file = await readFile(template);
  const name = `${entity.name}Create`;
  const formName = `${entity.name}Form`;
  const modulePath = `${entityToDirectory[entity.name]}/${name}.tsx`;

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
