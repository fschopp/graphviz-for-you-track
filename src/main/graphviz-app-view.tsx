import { ProjectPlan } from '@fschopp/project-planning-for-you-track';
import { AlertsView, NavView, Page, WarningsView, withClassIff, } from '@fschopp/project-planning-ui-for-you-track';
import { unreachableCase } from '@fschopp/project-planning-ui-for-you-track/dist/es6/utils/typescript';
import S from 's-js';
import * as Surplus from 'surplus'; // lgtm [js/unused-local-variable]
import data from 'surplus-mixin-data';
import { Action, GraphvizAppCtrl } from './graphviz-app-ctrl';
import { GraphvizApp, GraphvizAppComputation } from './graphviz-app-model';
import { GraphvizSettingsView } from './graphviz-settings-view';

export function GraphvizAppView(
    {app, appComputation, ctrl}:
      {
        app: GraphvizApp;
        appComputation: GraphvizAppComputation;
        ctrl: GraphvizAppCtrl;
      }
    ): HTMLElement {
  return (
      <div>
        <NavView appName={appComputation.name} currentPage={app.currentPage} progress={appComputation.progress}
                 numWarnings={() => numWarnings(appComputation.projectPlan())}
                 isActionBtnVisible={() => true}
                 actionBtnLabel={() => actionLabel(ctrl.action())}
                 actionSignal={appComputation.doAction} />
        {/* See https://stackoverflow.com/a/36247448 for "overflow-hidden" */}
        <main class="position-relative overflow-hidden flex-shrink-1 flex-grow-1 border-top"
              role="main">
          <div class="overflow-hidden position-absolute fill-parent d-flex flex-column"
               fn={withClassIff(() => app.currentPage() !== Page.HOME, 'invisible')}>
            <div class="d-flex align-items-center border-bottom px-3 py-2 flex-shrink-0 flex-grow-0">
              <label for="zoom" class="mb-0">🔍</label>
              <input class="custom-range ml-2" type="range" id="zoom" min="-200" max="200" step="1"
                     fn={data(app.zoom)}/>
            </div>
            <GraphvizContainer className="overflow-auto flex-shrink-1 flex-grow-1" svg={appComputation.visualPlan} />
          </div>
          <div class="overflow-auto position-absolute fill-parent"
               fn={withClassIff(() => app.currentPage() !== Page.WARNINGS, 'invisible')}>
            <div class="container">
              <h2 class="mt-3">Project Plan Warnings</h2>
              <WarningsView projectPlan={appComputation.projectPlan} />
            </div>
          </div>
          <div class="overflow-auto position-absolute fill-parent"
               fn={withClassIff(() => app.currentPage() !== Page.SETTINGS, 'invisible')}>
            <div class="container">
              <h2 class="mt-3">Settings</h2>
              <GraphvizSettingsView settings={app.settings} ctrl={ctrl.visualPlanSettingsCtrl}
                                    connectSignal={appComputation.connect}/>
            </div>
          </div>
        </main>
        <AlertsView alerts={appComputation.alerts} ctrl={ctrl.appCtrl.alertsCtrl} />
      </div>
  );
}

function GraphvizContainer({className, svg}: {className: string, svg: () => SVGSVGElement | undefined}): HTMLElement {
  const element: HTMLElement = <div class={className} />;
  S(() => {
    const currentChild: ChildNode | null = element.firstChild;
    const newSvg: SVGSVGElement | undefined = svg();

    if (currentChild !== null) {
      element.removeChild(currentChild);
    }
    if (newSvg !== undefined) {
      element.appendChild(newSvg);
    }
  });
  return element;
}

function numWarnings(projectPlan: ProjectPlan | undefined): number {
  return projectPlan === undefined
      ? 0
      : projectPlan.warnings.length;
}

function actionLabel(action: Action) {
  switch (action) {
    case Action.CONNECT: return 'Connect';
    case Action.BUILD_PLAN: return 'Build plan';
    case Action.UPDATE_PREDICTION: return 'Rebuild plan';
    case Action.STOP: return 'Stop';
    default: return unreachableCase(action);
  }
}
