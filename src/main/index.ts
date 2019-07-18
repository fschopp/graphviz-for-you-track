import { Router } from '@fschopp/project-planning-ui-for-you-track';
import S from 's-js';
import { GraphvizAppCtrl } from './graphviz-app-ctrl';
import {
  assignGraphvizApp,
  createGraphvizApp,
  createGraphvizAppComputation,
  GraphvizApp,
  GraphvizAppComputation,
} from './graphviz-app-model';
import { GraphvizAppView } from './graphviz-app-view';
import { assignGraphvizSettings } from './graphviz-settings-model';

S.root(() => {
  const app: GraphvizApp = createGraphvizApp();
  const appComputation: GraphvizAppComputation = createGraphvizAppComputation();

  const ctrl = GraphvizAppCtrl.createDefaultGraphvizCtrl(app, appComputation);
  new Router(
      app,
      (plainApp) => assignGraphvizApp(app, plainApp),
      (plainSettings) => assignGraphvizSettings(app.settings, plainSettings)
  );

  document.body.append(...GraphvizAppView({app, appComputation, ctrl}).children);
});

// The purpose of the exports is currently only documentation of the relevant elements.
export * from './graphviz-app-ctrl';
export * from './graphviz-app-model';
export * from './graphviz-app-view';
export * from './graphviz-settings-ctrl';
export * from './graphviz-settings-model';
export * from './graphviz-settings-view';
