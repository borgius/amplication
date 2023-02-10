import * as React from "react";
import { Edit, EditProps } from "react-admin";

export const COMPONENT_NAME = (props: EditProps): React.ReactElement => {
  return (
    <Edit {...props}>
      <COMPONENT_FORM />
    </Edit>
  );
};
