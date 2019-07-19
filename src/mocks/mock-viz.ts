// tslint:disable-next-line:no-reference
/// <reference path="../main/module.d.ts"/>

import Viz from 'viz.js';

const mockConstructor: typeof Viz = jest.fn<Viz, ConstructorParameters<typeof Viz>>();

export default mockConstructor;
