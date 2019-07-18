declare module 'viz.js' {
  /**
   * Graphviz wrapper class.
   *
   * See [wiki on GitHub](https://github.com/mdaines/viz.js/wiki/API#class-viz).
   */
  export default class Viz {
    /**
     * Constructs a new `Viz` instance.
     *
     * @param options
     * @param options.worker The `Worker` instance constructed with the URL or path of one of the rendering script files
     *     included in the distribution (`full.render.js` or `lite.render.js`).
     */
    constructor(options: {worker: Worker});

    /**
     * Renders the graph as an SVG element, suitable for inserting into the document.
     *
     * @param src The graph to render, as [DOT](http://www.graphviz.org/content/dot-language).
     */
    public renderSVGElement(src: string): Promise<SVGSVGElement>;
  }
}
