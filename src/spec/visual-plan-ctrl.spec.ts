import { YouTrackIssue } from '@fschopp/project-planning-for-you-track';
import { YouTrackMetadata } from '@fschopp/project-planning-ui-for-you-track';
import { EnumBundleCustomFieldDefaults } from '@fschopp/project-planning-ui-for-you-track/dist/es6/youtrack-rest';
// Since some (transpiled) dependencies define async functions, we need the Babel polyfill.
// See also: https://github.com/babel/babel/issues/5085
import 'regenerator-runtime';
import S from 's-js';
import { GraphvizAppCtrl } from '../main/graphviz-app-ctrl';
import {
  createGraphvizApp,
  createGraphvizAppComputation,
  GraphvizApp,
  GraphvizAppComputation,
} from '../main/graphviz-app-model';
import MockViz from '../mocks/mock-viz';
import MockWorker, { setup as mockWorkerSetup, tearDown as mockWorkerTearDown } from '../mocks/mock-worker';


// Note that the mock is hoisted to the top of the file!
// https://jestjs.io/docs/en/es6-class-mocks
jest.mock('viz.js', () => jest.requireActual('../mocks/mock-viz'));

beforeEach(() => {
  mockWorkerSetup();
});

afterEach(() => {
  mockWorkerTearDown();
});

test('generates visualization if GraphvizAppComputation.projectPlan signal changes', async () => {
  const app: GraphvizApp = createGraphvizApp();
  app.settings.youTrackBaseUrl('http://fake-youtrack/');
  app.settings.hubUrl('http://fake-hub/');
  const appComputation: GraphvizAppComputation = createGraphvizAppComputation();

  let appCtrl: GraphvizAppCtrl | undefined;
  S.root(() => {
    appCtrl = GraphvizAppCtrl.createDefaultGraphvizCtrl(app, appComputation, '/mock/path/to/worker.js');
  });
  if (appCtrl === undefined) {
    throw new Error('appCtrl should be defined');
  }

  expect(appComputation.dot()).toEqual(undefined);
  appComputation.youTrackMetadata(mockYouTrackMetadata);

  // At this point, no computation should have taken place yet.
  const mockWorkerConstructor = MockWorker as jest.Mock;
  const mockVizConstructor = MockViz as jest.Mock;
  expect(mockWorkerConstructor).not.toHaveBeenCalled();
  expect(mockVizConstructor).not.toHaveBeenCalled();

  // Prepare the mock SVG that will be return by the mock Viz, irrespective of input
  const mockRenderSVGElement = jest.fn();
  mockVizConstructor.mockImplementationOnce(() => ({
    renderSVGElement: mockRenderSVGElement,
  }));
  const mockSvg = new DOMParser().parseFromString('<svg></svg>', 'image/svg+xml').documentElement;
  mockRenderSVGElement.mockReturnValueOnce(Promise.resolve(mockSvg));

  // Now simulate receiving a ProjectPlan.
  appComputation.projectPlan({
    issues: youTrackIssues(mockIssues),
    warnings: [],
  });
  expect(mockWorkerConstructor).toHaveBeenCalledTimes(1);
  expect(mockVizConstructor).toHaveBeenCalledTimes(1);

  await runEventLoopUntil(() => appComputation.visualPlan() !== undefined);

  const dot: string | undefined = appComputation.dot();
  const svg: SVGSVGElement | undefined = appComputation.visualPlan();

  expect(dot).toEqual(expectedDot);
  expect(svg).toBe(mockSvg);
});

interface Issue {
  idx: number;
  resolved?: boolean;
  assignee?: number;
  parent?: number;
  type?: number;
  deps?: number[];
}

const mockIssues: Issue[] = [
  {idx: 1, assignee: 0, type: 0},
  {idx: 2, assignee: 0, parent: 1, type: 1},
  {idx: 3, assignee: 0, parent: 1, type: 0, deps: [2]},
  {idx: 4, assignee: 0, parent: 3},
  {idx: 5, assignee: 0, type: 2},
  {idx: 6, resolved: true, assignee: 0, parent: 5, type: 1},
  {idx: 7, assignee: 0, parent: 5, type: 3},
  {idx: 8, assignee: 0, type: 1, deps: [5]},
];

// noinspection HtmlDeprecatedTag,HtmlUnknownAttribute,RequiredAttributes
const expectedDot: string = stripFirstCharAndLeadingSpaces(`
    digraph ProjectPlan {
      graph [
        fontname = "helvetica";
        style = "rounded,filled";
        target = "_blank";
      ];
      node [
        fontname = "helvetica",
        shape = box;
        style = "rounded,filled";
        target = "_blank";
      ];
      edge [
        fontname = "helvetica";
      ];

      rankdir = LR;
      compound = true;
      newrank = true;
      ranksep = 1;

      subgraph cluster_XYZ_1 {
        label = <XYZ-1: Issue 1<br/><font point-size="12">User 0</font>>;
        href = "http://fake-youtrack/issue/XYZ-1";
        fillcolor = "#ffffff";
        fontcolor = "#000000";
        color = "#000000";

        XYZ_2 [
          label = <XYZ-2: Issue 2<br/><font point-size="12">User 0</font>>;
          href = "http://fake-youtrack/issue/XYZ-2";
          fillcolor = "#ffffff";
          fontcolor = "#000000";
          color = "#000000";
        ]
        subgraph cluster_XYZ_3 {
          label = <XYZ-3: Issue 3<br/><font point-size="12">User 0</font>>;
          href = "http://fake-youtrack/issue/XYZ-3";
          fillcolor = "#ffffff";
          fontcolor = "#000000";
          color = "#000000";

          XYZ_4 [
            label = <XYZ-4: Issue 4<br/><font point-size="12">User 0</font>>;
            href = "http://fake-youtrack/issue/XYZ-4";
            fillcolor = "#ffffff";
            fontcolor = "#000000";
            color = "#000000";
          ]
        }
      }
      subgraph cluster_XYZ_5 {
        label = <XYZ-5: Issue 5<br/><font point-size="12">User 0</font>>;
        href = "http://fake-youtrack/issue/XYZ-5";
        fillcolor = "#ffffff";
        fontcolor = "#000000";
        color = "#000000";

        XYZ_6 [
          label = <<s>XYZ-6: Issue 6</s><br/><font point-size="12">User 0</font>>;
          href = "http://fake-youtrack/issue/XYZ-6";
          fillcolor = "#ffffff";
          fontcolor = "#000000";
          color = "#000000";
        ]
        XYZ_7 [
          label = <XYZ-7: Issue 7<br/><font point-size="12">User 0</font>>;
          href = "http://fake-youtrack/issue/XYZ-7";
          fillcolor = "#ffffff";
          fontcolor = "#000000";
          color = "#000000";
        ]
      }
      XYZ_8 [
        label = <XYZ-8: Issue 8<br/><font point-size="12">User 0</font>>;
        href = "http://fake-youtrack/issue/XYZ-8";
        fillcolor = "#ffffff";
        fontcolor = "#000000";
        color = "#000000";
      ]

      XYZ_2 -> XYZ_4 [
        lhead = cluster_XYZ_3;
      ]
      XYZ_6 -> XYZ_8 [
        ltail = cluster_XYZ_5;
      ]
    }
    `);

const mockYouTrackMetadata: YouTrackMetadata = {
  baseUrl: 'http://fake-youtrack/',
  customFields: [{
    $type: 'FieldType',
    id: 'type-field-id',
    fieldDefaults: {
      $type: 'EnumBundleCustomFieldDefaults',
      bundle: {
        $type: 'EnumBundle',
        values: [{
          $type: 'EnumBundleElement',
          color: {
            $type: 'FieldStyle',
            background: '#111',
            foreground: '#111111',
          },
          id: 'type-1',
          name: 'Type 1',
          ordinal: 1,
        }],
      },
    } as EnumBundleCustomFieldDefaults,
    fieldType: {
      $type: 'FieldType',
      id: 'enum[1]',
    },
    name: 'Type',
  }],
  issueLinkTypes: [],
  savedSearches: [],
  users: [{
    $type: 'User',
    avatarUrl: '',
    fullName: 'User 0',
    id: 'user-0',
  }],
  minutesPerWorkWeek: 5 * 8 * 60,
};

function youTrackIssues(issues: Issue[]): YouTrackIssue[] {
  return issues.map((issue) => ({
    id: `XYZ-${issue.idx}`,
    summary: `Issue ${issue.idx}`,
    issueActivities: [],
    resolved: issue.resolved
        ? 1
        : Number.MAX_SAFE_INTEGER,
    state: '',
    assignee: `user-${issue.assignee}`,
    parent: issue.parent === undefined
        ? ''
        : `XYZ-${issue.parent}`,
    customFields: issue.type === undefined
        ? {} as {}
        : {
            'type-field-id': `type-${issue.type}`,
          },
    remainingEffortMs: 0,
    remainingWaitTimeMs: 0,
    splittable: false,
    dependencies: (issue.deps === undefined ? [] : issue.deps).map((dep) => `XYZ-${dep}`),
  }));
}

function runEventLoopUntil(condition: () => boolean, maxIterations: number = 10): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    function check(iteration: number) {
      if (condition()) {
        resolve();
      } else if (iteration >= maxIterations) {
        reject(new Error('runEventLoopUntil() reached maxIterations'));
      } else {
        setTimeout(() => check(iteration + 1));
      }
    }
    check(1);
  });
}

function stripFirstCharAndLeadingSpaces(text: string) {
  return text.substring(1).replace(/^ {4}/gm, '');
}
