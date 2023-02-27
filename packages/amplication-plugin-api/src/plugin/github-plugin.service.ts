import { readFileSync } from "fs";
import { Injectable } from "@nestjs/common";
import { Plugin } from "../../prisma/generated-prisma-client";
import fetch from "node-fetch";
import yaml from "js-yaml";
import glob from "glob";
import { PluginList, PluginYml } from "./plugin.types";
import {
  AMPLICATION_GITHUB_URL,
  AMPLICATION_LOCAL_FOLDER,
  emptyPlugin,
} from "./plugin.constants";
import { resolve } from "path";

const asyncGlob = (pattern, options) =>
  new Promise<string[]>((resolve, reject) => {
    glob(pattern, options, (err, files) =>
      err === null ? resolve(files) : reject(err)
    );
  });

@Injectable()
export class GitPluginService {
  /**
   * generator function to fetch each plugin yml and convert it to DB plugin structure
   * @param pluginList
   */
  async *getPluginConfig(
    pluginList: PluginList[]
  ): AsyncGenerator<PluginYml, void> {
    try {
      const pluginListLength = pluginList.length;
      let index = 0;

      do {
        const pluginUrl = pluginList[index].url;
        if (!pluginUrl)
          throw `Plugin ${pluginList[index].name} doesn't have url`;

        const response = await fetch(pluginUrl);
        const pluginConfig = await response.json();

        if (!pluginConfig && !pluginConfig.content) yield emptyPlugin;

        const fileContent = await Buffer.from(
          pluginConfig.content,
          "base64"
        ).toString();
        const fileYml: PluginYml = yaml.load(fileContent) as PluginYml;

        const pluginId = pluginList[index]["name"].replace(".yml", "");

        ++index;

        yield {
          ...fileYml,
          pluginId,
        };
      } while (pluginListLength > index);
    } catch (error) {
      console.log(error.message);
    }
  }
  /**
   * main function that fetch the catalog and trigger the generator in order to get each one of the plugins
   * @returns Plugin[]
   */
  async getPlugins(): Promise<Plugin[]> {
    try {
      const response = await fetch(AMPLICATION_GITHUB_URL);
      const pluginCatalog = await response.json();

      if (!pluginCatalog) throw "Failed to fetch github plugin catalog";

      const pluginsArr: Plugin[] = [];

      for await (const pluginConfig of this.getPluginConfig(pluginCatalog)) {
        if (!(pluginConfig as PluginYml).pluginId) continue;

        const currDate = new Date();
        pluginsArr.push({
          id: "",
          createdAt: currDate,
          description: pluginConfig.description,
          github: pluginConfig.github,
          icon: pluginConfig.icon,
          name: pluginConfig.name,
          npm: pluginConfig.npm,
          pluginId: pluginConfig.pluginId,
          website: pluginConfig.website,
          updatedAt: currDate,
        });
      }

      return pluginsArr;
    } catch (error) {
      /// return error from getPlugins
      console.log(error);
    }
  }

  /**
   * main function that get local plugins
   * @returns Plugin[]
   */
  async getLocalPlugins(): Promise<Plugin[]> {
    try {
      const packages: string[] = await asyncGlob("*/info.yml", {
        cwd: AMPLICATION_LOCAL_FOLDER,
      });
      if (!packages) throw "Failed to load local plugin catalog";

      const pluginsArr: Plugin[] = [];

      for (const infoFile of packages) {
        const fileYml = readFileSync(
          resolve(AMPLICATION_LOCAL_FOLDER, infoFile),
          "utf8"
        );
        const info: PluginYml = yaml.load(fileYml) as PluginYml;
        const currDate = new Date();
        pluginsArr.push({
          id: "",
          createdAt: currDate,
          description: info.description,
          github: info.github,
          icon: info.icon,
          name: info.name,
          npm: info.npm,
          pluginId: info.id,
          website: info.website,
          updatedAt: currDate,
        });
      }

      return pluginsArr;
    } catch (error) {
      /// return error from getPlugins
      console.log(error);
    }
  }
}
