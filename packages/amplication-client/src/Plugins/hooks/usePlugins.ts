import { QueryOptions, useMutation, useQuery } from "@apollo/client";
import {
  GET_PLUGIN_INSTALLATIONS,
  CREATE_PLUGIN_INSTALLATION,
  UPDATE_PLUGIN_INSTALLATION,
  GET_PLUGIN_ORDER,
  UPDATE_PLUGIN_ORDER,
  GET_PLUGIN_INSTALLATION,
  GET_PLUGIN_VERSIONS_CATALOG,
  CREATE_PLUGINS_INSTALLATION,
} from "../queries/pluginsQueries";
import * as models from "../../models";
import { keyBy } from "lodash";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppContext } from "../../context/appContext";

export type PluginVersion = {
  version: string;
  settings: string;
  id: string;
  pluginId: string;
};

export type Plugin = {
  id: string;
  pluginId: string;
  name: string;
  description: string;
  repo: string;
  npm: string;
  icon: string;
  github: string;
  website: string;
  category: string;
  type: string;
  versions: PluginVersion[];
};

export type OnPluginDropped = (
  dragItem: models.PluginInstallation,
  hoverItem: models.PluginInstallation
) => void;

const setPluginOrderMap = (pluginOrder: models.PluginOrderItem[]) => {
  return pluginOrder.reduce(
    (
      pluginOrderObj: { [key: string]: number },
      plugin: models.PluginOrderItem
    ) => {
      pluginOrderObj[plugin.pluginId] = plugin.order;

      return pluginOrderObj;
    },
    {}
  );
};

const usePlugins = (resourceId: string, pluginInstallationId?: string) => {
  const [pluginOrderObj, setPluginOrderObj] = useState<{
    [key: string]: number;
  }>();
  const [pluginsVersion, setPluginsVersion] = useState<{
    [key: string]: Plugin;
  }>({});
  const {
    data: pluginsVersionData,
    loading: loadingPluginsVersionData,
    error: errorPluginsVersionData,
  } = useQuery<{
    plugins: Plugin[];
  }>(GET_PLUGIN_VERSIONS_CATALOG, {
    skip: !pluginsVersion,
    context: {
      clientName: "pluginApiHttpLink",
    },
    variables: {
      where: {
        deprecated: {
          equals: null,
        },
      },
    },
  });
  const {
    addBlock,
    pendingChanges,
    resetPendingChangesIndicator,
    setResetPendingChangesIndicator,
  } = useContext(AppContext);

  const {
    data: pluginInstallations,
    loading: loadingPluginInstallations,
    refetch: refetchPluginInstallations,
    error: errorPluginInstallations,
  } = useQuery<{
    PluginInstallations: models.PluginInstallation[];
  }>(GET_PLUGIN_INSTALLATIONS, {
    variables: {
      resourceId: resourceId,
    },
    skip: !resourceId,
  });

  const {
    data: pluginInstallation,
    loading: loadingPluginInstallation,
    error: errorPluginInstallation,
  } = useQuery<{
    PluginInstallation: models.PluginInstallation;
  }>(GET_PLUGIN_INSTALLATION, {
    variables: {
      pluginId: pluginInstallationId,
    },
    skip: !pluginInstallationId,
  });

  const {
    data: pluginOrder,
    loading: loadingPluginOrder,
    refetch: refetchPluginOrder,
    error: pluginOrderError,
  } = useQuery<{ pluginOrder: models.PluginOrder }>(GET_PLUGIN_ORDER, {
    variables: {
      resourceId: resourceId,
    },
    skip: !resourceId,
  });

  useEffect(() => {
    if (!pluginsVersionData || loadingPluginsVersionData) return;

    const sortedPlugins = keyBy(
      pluginsVersionData.plugins,
      (plugin) => plugin.pluginId
    );
    setPluginsVersion(sortedPlugins);
  }, [pluginsVersionData, loadingPluginsVersionData]);

  useEffect(() => {
    if (!errorPluginsVersionData) return;

    setPluginsVersion({});
  }, [errorPluginsVersionData]);

  useEffect(() => {
    if (!pluginOrder || loadingPluginOrder) return;

    const setPluginOrder = setPluginOrderMap(pluginOrder?.pluginOrder.order);
    setPluginOrderObj(setPluginOrder);
  }, [pluginOrder, loadingPluginOrder]);

  useEffect(() => {
    if (!resetPendingChangesIndicator) return;

    setResetPendingChangesIndicator(false);
    refetchPluginInstallations();
    refetchPluginOrder();
  }, [pendingChanges, resetPendingChangesIndicator]);

  useEffect(() => {
    if (pluginOrderError) {
      setPluginOrderObj({});
    }
  }, [pluginOrderError]);

  const sortedPluginInstallation = useMemo(() => {
    if (!pluginOrder || !pluginInstallations) return undefined;

    const pluginOrderArr = [...(pluginOrder?.pluginOrder.order ?? [])];

    return pluginOrderArr.map((plugin: models.PluginOrderItem) => {
      return pluginInstallations?.PluginInstallations.find(
        (installationPlugin: models.PluginInstallation) =>
          installationPlugin.pluginId === plugin.pluginId
      );
    }) as unknown as models.PluginInstallation[];
  }, [pluginInstallations, pluginOrder]);

  const [updatePluginOrder, { error: UpdatePluginOrderError }] = useMutation<{
    setPluginOrder: models.PluginOrder;
  }>(UPDATE_PLUGIN_ORDER, {
    onCompleted: (data) => {
      addBlock(data.setPluginOrder.id);
    },
    refetchQueries: [
      {
        query: GET_PLUGIN_ORDER,
        variables: {
          resourceId: resourceId,
        },
      },
    ],
  });

  const [updatePluginInstallation, { error: updateError }] = useMutation<{
    updatePluginInstallation: models.PluginInstallation;
  }>(UPDATE_PLUGIN_INSTALLATION, {
    onCompleted: (data) => {
      addBlock(data.updatePluginInstallation.id);
    },
    refetchQueries: () => {
      const queries: QueryOptions[] = [
        {
          query: GET_PLUGIN_INSTALLATIONS,
          variables: {
            resourceId: resourceId,
          },
        },
        {
          query: GET_PLUGIN_ORDER,
          variables: {
            resourceId: resourceId,
          },
        },
      ];

      if (pluginInstallationId) {
        queries.push({
          query: GET_PLUGIN_INSTALLATION,
          variables: {
            pluginId: pluginInstallationId,
          },
        });
      }
      return queries;
    },
  });

  const [createPluginInstallations] = useMutation<{
    createPluginInstallations: models.PluginInstallation[];
  }>(CREATE_PLUGINS_INSTALLATION, {
    onCompleted: (data) => {
      data.createPluginInstallations.forEach((plugin) => {
        addBlock(plugin.id);
      });
    },
  });

  const [createPluginInstallation, { error: createError }] = useMutation<{
    createPluginInstallation: models.PluginInstallation;
  }>(CREATE_PLUGIN_INSTALLATION, {
    onCompleted: (data) => {
      addBlock(data.createPluginInstallation.id);
    },
    refetchQueries: [
      {
        query: GET_PLUGIN_INSTALLATIONS,
        variables: {
          resourceId: resourceId,
        },
      },
      {
        query: GET_PLUGIN_ORDER,
        variables: {
          resourceId: resourceId,
        },
      },
    ],
  });

  const onPluginDropped = useCallback(
    (
      dragPlugin: models.PluginInstallation,
      hoverPlugin: models.PluginInstallation
    ) => {
      console.log(dragPlugin, hoverPlugin);
    },
    []
  );

  return {
    pluginInstallations: sortedPluginInstallation,
    loadingPluginInstallations,
    errorPluginInstallations,
    pluginInstallation,
    loadingPluginInstallation,
    errorPluginInstallation,
    updatePluginInstallation,
    updateError,
    createPluginInstallation,
    createPluginInstallations,
    createError,
    pluginCatalog: pluginsVersion,
    onPluginDropped,
    pluginOrderObj,
    updatePluginOrder,
    UpdatePluginOrderError,
  };
};

export default usePlugins;
