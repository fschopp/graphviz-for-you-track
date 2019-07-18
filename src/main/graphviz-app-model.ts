import { ProjectPlan } from '@fschopp/project-planning-for-you-track';
import {
  App,
  AppComputation,
  assignApp,
  createApp,
  createAppComputation,
  jsonable,
  Plain,
} from '@fschopp/project-planning-ui-for-you-track';
import S, { DataSignal } from 's-js';
import { assignGraphvizSettings, createGraphvizSettings, GraphvizSettings } from './graphviz-settings-model';

export interface GraphvizApp extends App<GraphvizSettings> {
  readonly zoom: DataSignal<number>;
}

export interface GraphvizAppComputation extends AppComputation {
  /**
   * Signal to trigger the current action ({@link GraphvizAppCtrl.action}).
   */
  readonly doAction: DataSignal<null>;

  /**
   * Signal carrying YouTrack issue data.
   */
  readonly projectPlan: DataSignal<ProjectPlan | undefined>;

  /**
   * Signal carrying the Graphviz (dot) source code.
   */
  readonly dot: DataSignal<string | undefined>;

  /**
   * Signal carrying an SVG visualizing the project, or `undefined` if no visual plan was computed yet.
   */
  readonly visualPlan: DataSignal<SVGSVGElement | undefined>;
}

/**
 * Returns a newly created object for keeping the user-provided application state.
 */
export function createGraphvizApp(): GraphvizApp {
  return {
    ...createApp(createGraphvizSettings()),
    zoom: jsonable(S.value(0)),
  };
}

/**
 * Returns a newly created object for keeping the computed application state.
 */
export function createGraphvizAppComputation(): GraphvizAppComputation {
  return {
    ...createAppComputation(),
    doAction: S.data(null),
    projectPlan: S.value(undefined),
    dot: S.value(undefined),
    visualPlan: S.value(undefined),
  };
}

/**
 * Updates the application state to the given values in a plain JSON object.
 *
 * The update is performed within a single S.js transaction.
 *
 * @param visualPlanApp application state
 * @param plain plain JSON object
 */
export function assignGraphvizApp(visualPlanApp: GraphvizApp, plain: Plain<GraphvizApp>) {
  S.freeze(() => {
    assignApp(visualPlanApp, plain);
    assignGraphvizSettings(visualPlanApp.settings, plain.settings);
    visualPlanApp.zoom(plain.zoom);
  });
}
