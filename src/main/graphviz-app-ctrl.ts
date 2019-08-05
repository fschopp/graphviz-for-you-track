// tslint:disable-next-line:no-reference
/// <reference path="module.d.ts"/>

import {
  IssueNode,
  makeForest,
  ProjectPlan,
  retrieveProjectPlan,
  RetrieveProjectPlanOptions,
  traverseIssueForest,
  YouTrackConfig,
  YouTrackIssue,
} from '@fschopp/project-planning-for-you-track';
import {
  AppCtrl,
  Page,
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
  COMPLETE_SETTINGS = 'complete',
  CONNECT = 'connect',
  BUILD_PLAN = 'build',
  UPDATE_PLAN = 'update',
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
        app: GraphvizApp, appComputation: GraphvizAppComputation, vizWorkerUrl: string): GraphvizAppCtrl {
    const appCtrl: AppCtrl<GraphvizSettings> = AppCtrl.createDefaultAppCtrl(app, appComputation);
    const visualPlanSettingsCtrl = new GraphvizSettingsCtrl(appCtrl.settingsCtrl, appCtrl.youTrackMetadataCtrl);
    return new GraphvizAppCtrl(app, appComputation, vizWorkerUrl, appCtrl, visualPlanSettingsCtrl);
  }

  public constructor(
      private readonly visualPlanApp_: GraphvizApp,
      private readonly visualPlanAppComputation_: GraphvizAppComputation,
      private readonly vizWorkerUrl_: string,
      public readonly appCtrl: AppCtrl<GraphvizSettings>,
      public readonly visualPlanSettingsCtrl: GraphvizSettingsCtrl
  ) {
    this.action = S(() => actionFromState(
        this.visualPlanAppComputation_.progress(), this.appCtrl.youTrackMetadataCtrl.pendingMetadata(),
        this.appCtrl.youTrackMetadataCtrl.definedYouTrackMetadata(), this.visualPlanAppComputation_.projectPlan(),
        this.visualPlanAppComputation_.numInvalidSettings() === 0));
    this.typeMap_ = S(() => {
      const youTrackMetadata: YouTrackMetadata = this.appCtrl.youTrackMetadataCtrl.definedYouTrackMetadata();
      const typeFieldId: string = this.visualPlanApp_.settings.typeFieldId();
      let typeField: CustomField | undefined;
      for (const customField of youTrackMetadata.customFields) {
        if (typeFieldId === customField.id) {
          typeField = customField;
          break;
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
      case Action.COMPLETE_SETTINGS: this.visualPlanApp_.currentPage(Page.SETTINGS); return;
      case Action.CONNECT: this.visualPlanAppComputation_.connect(null); return;
      case Action.BUILD_PLAN: case Action.UPDATE_PLAN:
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
        this.appCtrl.settingsCtrl.normalizedBaseUrl(),
        youTrackConfig,
        options
    );
    this.visualPlanAppComputation_.projectPlan(projectPlan);
  }

  private updateDot(): void {
    const projectPlan: ProjectPlan | undefined = this.visualPlanAppComputation_.projectPlan();
    const normalizedBaseUrl: string = this.appCtrl.youTrackMetadataCtrl.definedYouTrackMetadata().baseUrl;
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
      // Note that we still must update this.visualPlanAppComputation_.progress (which we do).
    }
    if (dot === undefined) {
      this.visualPlanAppComputation_.visualPlan(undefined);
      this.visualPlanAppComputation_.progress(undefined);
    } else {
      // Progress stays at 95% for the lack of a more accurate estimate. (Retrieving data from YouTrack accounts for the
      // "first" 90%, and 95% is the center between 90% and 100%...)
      this.visualPlanAppComputation_.progress(95);
      const promiseAndCancel = computeSvgFromDot(dot, this.vizWorkerUrl_);
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
    youTrackMetadata: YouTrackMetadata, projectPlan: ProjectPlan | undefined,
    hasCompleteSettings: boolean): Action {
  if (progress !== undefined || pendingMetadata) {
    return Action.STOP;
  } else if (!hasCompleteSettings) {
    return Action.COMPLETE_SETTINGS;
  } else if (youTrackMetadata.baseUrl.length === 0) {
    return Action.CONNECT;
  } else if (projectPlan === undefined) {
    return Action.BUILD_PLAN;
  } else {
    return Action.UPDATE_PLAN;
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
}

interface ExtendedIssue extends YouTrackIssue {
  graphvizIssue: GraphvizIssue;
}

interface DotBuilder {
  dot: string;
  dependenciesDot: string;
}

function enterNode(dotBuilder: DotBuilder, currentIndent: string, node: IssueNode<ExtendedIssue>, baseUrl: string):
    void {
  const graphvizIssue: GraphvizIssue = node.issue.graphvizIssue;
  const isSubgraph: boolean = node.children.length > 0;
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
    // noinspection HtmlUnknownAttribute,HtmlDeprecatedTag
    dotBuilder.dot += `<br/><font point-size="12">${assignee}</font>`;
  }
  dotBuilder.dot += '>;\n' +
      currentIndent + `  href = "${baseUrl}issue/${graphvizIssue.id}";\n` +
      currentIndent + `  fillcolor = "${bgColor}";\n` +
      currentIndent + `  fontcolor = "${fgColor}";\n` +
      currentIndent + `  color = "${fgColor}";\n`;
  const label: string = linkLabelForIssueNode(node);
  for (const dependencyNode of node.dependencies) {
    const dependency: GraphvizIssue = dependencyNode.issue.graphvizIssue;
    const dependencyLabel: string = linkLabelForIssueNode(dependencyNode);
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
  if (node.children.length > 0) {
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
  const extendedIssues: ExtendedIssue[] = issues.map((issue) => {
    const typeId: string | undefined = issue.customFields[typeFieldId];
    const graphvizIssue: GraphvizIssue = {
      id: issue.id,
      label: labelFromId(issue.id),
      summary: issue.summary,
      escapedSummary: replaceWithHtmlEntities(issue.summary),
      isResolved: issue.resolved < Number.MAX_SAFE_INTEGER,
      assignee: userMap.get(issue.assignee),
      type: typeId === undefined
          ? undefined
          : typeMap.get(typeId),
    };
    return {...issue, graphvizIssue};
  });
  let indentLevel = 0;
  const indent: () => string = () => '  '.repeat(indentLevel);
  traverseIssueForest(
      makeForest(extendedIssues),
      (node) => {
        ++indentLevel;
        enterNode(dotBuilder, indent(), node, baseUrl);
      },
      (node) => {
        leaveNode(dotBuilder, indent(), node.children.length > 0);
        --indentLevel;
      }
  );
  if (dotBuilder.dependenciesDot.length > 0) {
    dotBuilder.dot += '\n' + dotBuilder.dependenciesDot;
  }
  dotBuilder.dot += '}\n';
  return dotBuilder.dot;
}

function computeSvgFromDot(dot: string, workerUrl: string):
    {
      promise: Promise<SVGSVGElement>,
      cancel: () => void,
    } {
  const worker = new Worker(workerUrl);
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

function linkLabelForIssueNode(node: IssueNode<ExtendedIssue>): string {
  let currentNode: IssueNode<ExtendedIssue> = node;
  while (currentNode.children.length > 0) {
    currentNode = currentNode.children[0];
  }
  return currentNode.issue.graphvizIssue.label;
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
