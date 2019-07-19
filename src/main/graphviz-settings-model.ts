import {
  assignDependsLinkType,
  assignSettings,
  createDependsLinkType,
  createSettings,
  DependsLinkType,
  jsonable,
  Plain,
  Settings,
} from '@fschopp/project-planning-ui-for-you-track';
import S, { DataSignal } from 's-js';

/**
 * User-provided settings pertaining to invoking Graphviz on YouTrack data.
 */
export interface GraphvizSettings extends Settings, DependsLinkType {
  readonly assigneeFieldId: DataSignal<string>;
  readonly typeFieldId: DataSignal<string>;
  readonly savedQueryId: DataSignal<string>;
}

/**
 * Creates a new settings (view model) object.
 */
export function createGraphvizSettings(): GraphvizSettings {
  return {
    ...createSettings(),
    assigneeFieldId: jsonable(S.value('')),
    typeFieldId: jsonable(S.value('')),
    ...createDependsLinkType(),
    savedQueryId: jsonable(S.value('')),
  };
}

/**
 * Updates a settings (view model) object to the given values in a plain JSON object.
 *
 * The update is performed within a single S.js transaction.
 *
 * @param settings the settings (view model) object
 * @param plain plain JSON object
 */
export function assignGraphvizSettings(settings: GraphvizSettings, plain: Plain<GraphvizSettings>):
    void {
  S.freeze(() => {
    assignSettings(settings, plain);
    settings.assigneeFieldId(plain.assigneeFieldId);
    settings.typeFieldId(plain.typeFieldId);
    assignDependsLinkType(settings, plain);
    settings.savedQueryId(plain.savedQueryId);
  });
}
