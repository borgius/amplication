import * as React from "react";
import { Create, CreateProps } from "react-admin";

export const COMPONENT_NAME = (props: CreateProps): React.ReactElement => {
  return (
    <Create {...props}>
      <COMPONENT_FORM />
    </Create>
  );
};
