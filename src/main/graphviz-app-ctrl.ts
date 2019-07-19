// tslint:disable-next-line:no-reference
/// <reference path="module.d.ts"/>

import {
  ProjectPlan,
  retrieveProjectPlan,
  RetrieveProjectPlanOptions,
  YouTrackConfig,
  YouTrackIssue,
} from '@fschopp/project-planning-for-you-track';
import {
  AppCtrl,
  Plain,
  toNormalizedPlainSettings,
  unreachableCase,
  YouTrackMetadata,
} from '@fschopp/project-planning-ui-for-you-track';
import {
  CustomField,
  EnumBundleCustomFieldDefaults,
  EnumBundleElement,
  User,
} from '@fschopp/project-planning-ui-for-you-track/dist/es6/youtrack-rest';
import { strict as assert } from 'assert';
import S, { DataSignal } from 's-js';
import Viz from 'viz.js';
import { GraphvizApp, GraphvizAppComputation } from './graphviz-app-model';
import { GraphvizSettingsCtrl } from './graphviz-settings-ctrl';
import { GraphvizSettings } from './graphviz-settings-model';

export enum Action {
  CONNECT = 'connect',
  BUILD_PLAN = 'build',
  UPDATE_PREDICTION = 'update',
  STOP = 'stop',
}

export class GraphvizAppCtrl {
  /**
   * Signal carrying the kind of action triggered by the button in the nav bar.
   */
  public readonly action: () => Action;

  private cancelLastInvocation_: (() => void) | undefined;
  private readonly typeMap_: DataSignal<Map<string, EnumBundleElement>>;
  private readonly aspectRatio_: DataSignal<WidthAndHeight | undefined> = S.value(undefined);
  private readonly widthAndHeight_: () => WidthAndHeight | undefined;

  public static createDefaultGraphvizCtrl(
        app: GraphvizApp, appComputation: GraphvizAppComputation): GraphvizAppCtrl {
    const appCtrl: AppCtrl<GraphvizSettings> = AppCtrl.createDefaultAppCtrl(app, appComputation);
    const visualPlanSettingsCtrl = new GraphvizSettingsCtrl(appCtrl.settingsCtrl, appCtrl.youTrackMetadataCtrl);
    return new GraphvizAppCtrl(app, appComputation, appCtrl, visualPlanSettingsCtrl);
  }

  public constructor(
      private readonly visualPlanApp_: GraphvizApp,
      private readonly visualPlanAppComputation_: GraphvizAppComputation,
      public readonly appCtrl: AppCtrl<GraphvizSettings>,
      public readonly visualPlanSettingsCtrl: GraphvizSettingsCtrl
  ) {
    this.action = S(() => actionFromState(
        this.visualPlanAppComputation_.progress(), this.appCtrl.youTrackMetadataCtrl.pendingMetadata(),
        this.visualPlanAppComputation_.youTrackMetadata(), this.visualPlanAppComputation_.projectPlan()));
    this.typeMap_ = S(() => {
      const youTrackMetadata: YouTrackMetadata | undefined = this.visualPlanAppComputation_.youTrackMetadata();
      const typeFieldId: string = this.visualPlanApp_.settings.typeFieldId();
      let typeField: CustomField | undefined;
      if (youTrackMetadata !== undefined) {
        for (const customField of youTrackMetadata.customFields) {
          if (typeFieldId === customField.id) {
            typeField = customField;
            break;
          }
        }
      }
      const array: EnumBundleElement[] = typeField === undefined
          ? []
          : (typeField.fieldDefaults as EnumBundleCustomFieldDefaults).bundle.values
              .sort((left, right) => left.ordinal - right.ordinal);
      return array.reduce((map, element) => map.set(element.id, element), new Map<string, EnumBundleElement>());
    });

    // 'seed' is undefined (the calculation does not keep a state), and 'onchanges' is true (skip the initial run).
    S.on(this.visualPlanAppComputation_.doAction, () => this.doAction(), undefined, true);

    // The Graphviz (dot) source depends on multiple signals. See method for details.
    S(() => this.updateDot());

    // 'seed' is undefined (the calculation does not keep a state), and 'onchanges' is false (do the initial run).
    S.on(visualPlanAppComputation_.dot, () => this.updateSvg(), undefined, false);

    this.widthAndHeight_ = S(() => {
      const svg: SVGSVGElement | undefined = S.sample(visualPlanAppComputation_.visualPlan);
      const aspectRatio: WidthAndHeight | undefined = this.aspectRatio_();
      const zoom: number = this.visualPlanApp_.zoom();
      if (svg === undefined || aspectRatio === undefined) {
        return undefined;
      }

      const zoomFactor = Math.pow(2, zoom / 100);
      return {
        width: aspectRatio.width * zoomFactor,
        height: aspectRatio.height * zoomFactor,
      };
    });

    S.on(this.widthAndHeight_, () => {
      const svg: SVGSVGElement | undefined = S.sample(visualPlanAppComputation_.visualPlan);
      const widthAndHeight: WidthAndHeight | undefined = this.widthAndHeight_();
      if (svg === undefined || widthAndHeight === undefined) {
        return;
      }
      svg.width.baseVal.value = widthAndHeight.width;
      svg.height.baseVal.value = widthAndHeight.height;
    }, undefined, false);
  }

  private doAction(): void {
    const action: Action = this.action();
    switch (action) {
      case Action.CONNECT: this.visualPlanAppComputation_.connect(null); return;
      case Action.BUILD_PLAN: case Action.UPDATE_PREDICTION:
        return this.appCtrl.showErrorIfFailure(
            'Failed to build visual plan',
            this.buildPlan(toNormalizedPlainSettings(this.visualPlanApp_.settings))
        );
      case Action.STOP: return;
      default: return unreachableCase(action);
    }
  }

  private async buildPlan(currentConfig: Plain<GraphvizSettings>): Promise<void> {
    const typeFieldId = currentConfig.typeFieldId;
    const youTrackConfig: YouTrackConfig = {
      stateFieldId: '',
      inactiveStateIds: [],
      assigneeFieldId: currentConfig.assigneeFieldId,
      otherCustomFieldIds: [typeFieldId],
      dependsLinkTypeId: currentConfig.dependsLinkTypeId,
      doesInwardDependOnOutward: currentConfig.doesInwardDependOnOutward,
      savedQueryId: currentConfig.savedQueryId,
    };
    const options: RetrieveProjectPlanOptions = {
      progressCallback: (percentDone) => this.visualPlanAppComputation_.progress(0.9 * percentDone),
      omitIssueActivities: true,
    };
    const projectPlan: ProjectPlan = await retrieveProjectPlan(
        this.appCtrl.settingsCtrl.verifiedBaseUrl(),
        youTrackConfig,
        options
    );
    this.visualPlanAppComputation_.projectPlan(projectPlan);
  }

  private updateDot(): void {
    const projectPlan: ProjectPlan | undefined = this.visualPlanAppComputation_.projectPlan();
    const normalizedBaseUrl: string | undefined = opt(this.visualPlanAppComputation_.youTrackMetadata(), 'baseUrl');
    const userMap: Map<string, User> = this.appCtrl.youTrackMetadataCtrl.youTrackUserMap();
    const typeFieldId: string = this.visualPlanApp_.settings.typeFieldId();
    const typeMap: Map<string, EnumBundleElement> = this.typeMap_();
    this.visualPlanAppComputation_.dot(
        projectPlan === undefined || normalizedBaseUrl === undefined
            ? undefined
            : computeDotFromIssues(projectPlan.issues, normalizedBaseUrl, userMap, typeFieldId, typeMap)
    );
  }

  private updateSvg(): void {
    const dot: string | undefined = this.visualPlanAppComputation_.dot();
    if (this.cancelLastInvocation_ !== undefined) {
      this.cancelLastInvocation_();
      this.cancelLastInvocation_ = undefined;
    }
    if (dot === undefined) {
      this.visualPlanAppComputation_.visualPlan(undefined);
    } else {
      // Progress stays at 95% for the lack of a more accurate estimate. (Retrieving data from YouTrack accounts for the
      // "first" 90%, and 95% is the center between 90% and 100%...)
      this.visualPlanAppComputation_.progress(95);
      const promiseAndCancel = computeSvgFromDot(dot);
      this.cancelLastInvocation_ = promiseAndCancel.cancel;
      const promise = promiseAndCancel.promise.then((svg) => {
        this.cancelLastInvocation_ = undefined;
        this.visualPlanAppComputation_.visualPlan(svg);
        this.aspectRatio_({
          width: svg.viewBox.baseVal.width,
          height: svg.viewBox.baseVal.height,
        });
      });
      this.appCtrl.showErrorIfFailure('Failed to build visual plan', promise);
    }
  }
}


function opt<T, P extends keyof T>(obj: T | undefined, property: P): T[P] | undefined {
  return obj === undefined
      ? undefined
      : obj[property];
}

function opt2<T, P extends keyof T, Q extends keyof T[P]>(
    obj: T | undefined, property1: P, property2: Q): T[P][Q] | undefined {
  return obj === undefined || obj[property1] === undefined
      ? undefined
      : obj[property1][property2];
}

function coalesce<T>(left: T | undefined, right: T): T {
  return left !== undefined
      ? left
      : right;
}

function actionFromState(progress: number | undefined, pendingMetadata: boolean,
    youTrackMetadata: YouTrackMetadata | undefined, projectPlan: ProjectPlan | undefined): Action {
  if (progress !== undefined || pendingMetadata) {
    return Action.STOP;
  } else if (youTrackMetadata === undefined) {
    return Action.CONNECT;
  } else if (projectPlan === undefined) {
    return Action.BUILD_PLAN;
  } else {
    return Action.UPDATE_PREDICTION;
  }
}

interface WidthAndHeight {
  readonly width: number;
  readonly height: number;
}

interface GraphvizIssue {
  id: string;
  label: string;
  summary: string;
  escapedSummary: string;
  isResolved: boolean;
  assignee?: User;
  type?: EnumBundleElement;
  parent?: GraphvizIssue;
  dependencies: GraphvizIssue[];
  children: GraphvizIssue[];
}

/**
 * Creates a new tree of {@link GraphvizIssue} nodes, and returns an `Iterable` over all roots.
 */
function rootIssues(issues: YouTrackIssue[], userMap: Map<string, User>, typeFieldId: string,
    typeMap: Map<string, EnumBundleElement>): Iterable<GraphvizIssue> {
  const idToYouTrackIssueMap: Map<string, YouTrackIssue> =
      issues.reduce((map, issue) => map.set(issue.id, issue), new Map<string, YouTrackIssue>());
  const idToGraphvizMap: Map<string, GraphvizIssue> =
      issues.reduce((map, issue) => {
        const typeId: string | undefined = issue.customFields[typeFieldId];
        return map.set(issue.id, {
            id: issue.id,
            label: labelFromId(issue.id),
            summary: issue.summary,
            escapedSummary: replaceWithHtmlEntities(issue.summary),
            isResolved: issue.resolved < Number.MAX_SAFE_INTEGER,
            assignee: userMap.get(issue.assignee),
            type: typeId === undefined
                ? undefined
                : typeMap.get(typeId),
            dependencies: [],
            children: [],
          });
      }, new Map<string, GraphvizIssue>());
  for (const graphvizIssue of idToGraphvizMap.values()) {
    const youTrackIssue: YouTrackIssue = idToYouTrackIssueMap.get(graphvizIssue.id)!;

    const parentKey: string = youTrackIssue.parent;
    if (parentKey.length > 0) {
      graphvizIssue.parent = idToGraphvizMap.get(parentKey)!;
      graphvizIssue.parent.children.push(graphvizIssue);
    }

    for (const dependency of youTrackIssue.dependencies) {
      graphvizIssue.dependencies.push(idToGraphvizMap.get(dependency)!);
    }
  }
  return {
    * [Symbol.iterator]() {
      for (const graphvizIssue of idToGraphvizMap.values()[Symbol.iterator]()) {
        if (graphvizIssue.parent === undefined) {
          yield graphvizIssue;
        }
      }
    },
  };
}

interface DotBuilder {
  dot: string;
  dependenciesDot: string;
}

function enterNode(dotBuilder: DotBuilder, currentIndent: string, graphvizIssue: GraphvizIssue, baseUrl: string): void {
  const isSubgraph: boolean = graphvizIssue.children.length > 0;
  dotBuilder.dot += currentIndent;
  if (isSubgraph) {
    dotBuilder.dot += `subgraph cluster_${graphvizIssue.label} {\n`;
  } else {
    dotBuilder.dot += `${graphvizIssue.label} [\n`;
  }
  const fgColor = sixDigitColor(coalesce(opt2(graphvizIssue.type, 'color', 'foreground'), '#000000'));
  const bgColor = sixDigitColor(coalesce(opt2(graphvizIssue.type, 'color', 'background'), '#ffffff'));
  let beginLabel: string = '';
  let endLabel: string = '';
  if (graphvizIssue.isResolved) {
    beginLabel = '<s>';
    endLabel = '</s>';
  }
  const assignee: string | undefined = opt(graphvizIssue.assignee, 'fullName');
  dotBuilder.dot +=
      currentIndent + `  label = <${beginLabel}${graphvizIssue.id}: ${graphvizIssue.escapedSummary}${endLabel}`;
  if (assignee !== undefined) {
    dotBuilder.dot += `<br/><font point-size="12">${assignee}</font>`;
  }
  dotBuilder.dot += '>;\n' +
      currentIndent + `  href = "${baseUrl}youtrack/issue/${graphvizIssue.id}";\n` +
      currentIndent + `  fillcolor = "${bgColor}";\n` +
      currentIndent + `  fontcolor = "${fgColor}";\n` +
      currentIndent + `  color = "${fgColor}";\n`;
  const label: string = linkNodeForIssue(graphvizIssue);
  for (const dependency of graphvizIssue.dependencies) {
    const dependencyLabel: string = linkNodeForIssue(dependency);
    const isDependencySubgraph: boolean = dependencyLabel !== dependency.label;
    dotBuilder.dependenciesDot += `  ${dependencyLabel} -> ${label}`;
    if (isSubgraph || isDependencySubgraph) {
      dotBuilder.dependenciesDot += ' [\n';
      if (isDependencySubgraph) {
        dotBuilder.dependenciesDot += `    ltail = cluster_${dependency.label};\n`;
      }
      if (isSubgraph) {
        dotBuilder.dependenciesDot += `    lhead = cluster_${graphvizIssue.label};\n`;
      }
      dotBuilder.dependenciesDot += '  ]';
    }
    dotBuilder.dependenciesDot += '\n';
  }
  if (graphvizIssue.children.length > 0) {
    dotBuilder.dot += '\n';
  }
}

function leaveNode(dotBuilder: DotBuilder, currentIndent: string, isParent: boolean): void {
  if (isParent) {
    dotBuilder.dot += currentIndent + '}\n';
  } else {
    dotBuilder.dot += currentIndent + ']\n';
  }
}

function computeDotFromIssues(issues: YouTrackIssue[], baseUrl: string, userMap: Map<string, User>,
    typeFieldId: string, typeMap: Map<string, EnumBundleElement>): string {
  const dotBuilder: DotBuilder = {
    dot:
        'digraph ProjectPlan {\n' +
        '  graph [\n' +
        '    fontname = "helvetica";\n' +
        '    style = "rounded,filled";\n' +
        '    target = "_blank";\n' +
        '  ];\n' +
        '  node [\n' +
        '    fontname = "helvetica",\n' +
        '    shape = box;\n' +
        '    style = "rounded,filled";\n' +
        '    target = "_blank";\n' +
        '  ];\n' +
        '  edge [\n' +
        '    fontname = "helvetica";\n' +
        '  ];\n' +
        '\n' +
        '  rankdir = LR;\n' +
        '  compound = true;\n' +
        '  newrank = true;\n' +
        '  ranksep = 1;\n' +
        '\n',
    dependenciesDot: '',
  };
  let currentIterator: Iterator<GraphvizIssue> = rootIssues(issues, userMap, typeFieldId, typeMap)[Symbol.iterator]();
  const stack: Iterator<GraphvizIssue>[] = [];
  const indent: () => string = () => '  '.repeat(stack.length + 1);
  while (true) {
    const iteratorResult = currentIterator.next();
    if (iteratorResult.done) {
      if (stack.length === 0) {
        break;
      }
      currentIterator = stack.pop()!;
      leaveNode(dotBuilder, indent(), true);
    } else {
      const graphvizIssue: GraphvizIssue = iteratorResult.value;
      const currentIndent: string = indent();
      enterNode(dotBuilder, currentIndent, graphvizIssue, baseUrl);
      if (graphvizIssue.children.length > 0) {
        stack.push(currentIterator);
        currentIterator = graphvizIssue.children[Symbol.iterator]();
      } else {
        leaveNode(dotBuilder, currentIndent, false);
      }
    }
  }
  if (dotBuilder.dependenciesDot.length > 0) {
    dotBuilder.dot += '\n' + dotBuilder.dependenciesDot;
  }
  dotBuilder.dot += '}\n';
  return dotBuilder.dot;
}

function computeSvgFromDot(dot: string):
    {
      promise: Promise<SVGSVGElement>,
      cancel: () => void,
    } {
  // We need full.render.js (instead of lite.render.js) for HTML-like labels
  const worker = new Worker('../../node_modules/viz.js/full.render.js');
  const viz = new Viz({worker});
  let isCanceled = false;

  async function promise(): Promise<SVGSVGElement> {
    let errorStr: string;
    try {
      const svg: SVGSVGElement = await viz.renderSVGElement(dot);
      if (isCanceled) {
        errorStr = 'Graphviz was canceled.';
      } else {
        return svg;
      }
    } catch (error) {
      errorStr = error.toString();
    } finally {
      worker.terminate();
    }
    throw errorStr;
  }

  // If the cancel() method is called, we terminate the worker. That means that the promise will never be settled.
  // However, the promise is expected to fall out of scope, and the garbage collector should do its job. There should be
  // no memory leak. For reference, see: https://github.com/tc39/ecmascript-asyncawait/issues/89 and also
  // https://stackoverflow.com/q/20068467
  const cancel = () => {
    isCanceled = true;
    worker.terminate();
  };
  return {promise: promise(), cancel};
}

function labelFromId(id: string): string {
  return id.replace(/^[0-9]/, '_$&').replace(/[^a-zA-Z0-9_]/g, () => '_');
}

function sixDigitColor(color: string) {
  assert(color.match(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/) !== null);
  return (color.length === 4
      ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
      : color);
}

function linkNodeForIssue(issue: GraphvizIssue): string {
  let currentIssue: GraphvizIssue = issue;
  while (currentIssue.children.length > 0) {
    currentIssue = currentIssue.children[0];
  }
  return currentIssue.label;
}

/**
 * Escapes text for use within HTML.
 *
 * See, e.g., https://stackoverflow.com/a/4835406.
 */
function replaceWithHtmlEntities(text: string): string {
  const map: {[key: string]: string} = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
