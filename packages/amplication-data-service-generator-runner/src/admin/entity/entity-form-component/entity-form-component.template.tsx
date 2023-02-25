import * as React from "react";
import { SimpleForm } from "react-admin";

declare const INPUTS: React.ReactElement[];

export const COMPONENT_NAME = (): React.ReactElement => {
  return <SimpleForm>{INPUTS}</SimpleForm>;
};
