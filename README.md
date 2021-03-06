Graphviz for YouTrack. Web app that builds a visual overview of the issues in a [YouTrack saved search](https://www.jetbrains.com/help/youtrack/standalone/Saved-Search.html).

## Status

[![Build Status](https://travis-ci.org/fschopp/graphviz-for-you-track.svg?branch=master)](https://travis-ci.org/fschopp/graphviz-for-you-track)
[![Coverage Status](https://coveralls.io/repos/github/fschopp/graphviz-for-you-track/badge.svg?branch=master)](https://coveralls.io/github/fschopp/graphviz-for-you-track?branch=master)
[![Language grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/fschopp/graphviz-for-you-track.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/fschopp/graphviz-for-you-track/context:javascript)

## Overview

![Graphviz for YouTrack Demo](https://raw.githubusercontent.com/fschopp/graphviz-for-you-track/master/.readme-img/graphviz-for-you-track-demo.gif)

#### Use Case
- Web app that visualizes both parent-child and dependency relationships of the issues in a YouTrack saved search.
- Solves a popular feature request for YouTrack (see [YouTrack issue JT-13900](https://youtrack.jetbrains.com/issue/JT-13900)).

#### User Friendly
- Runs entirely in the browser. No installation required by users. (As a one-time setup, the YouTrack administrator needs to add the URI of the web app to the so-called [“Resource Sharing” settings in YouTrack](https://www.jetbrains.com/help/youtrack/standalone/Managing-Global-Settings.html#resource-sharing-settings).)
- No separate login required for this web app (assuming the user is already logged into YouTrack).
- Available for immediate use at: https://fschopp.github.io/graphviz-for-you-track

#### Secure
- This web app never comes in touch with your password (thanks to [OAuth 2.0](https://www.jetbrains.com/help/youtrack/standalone/OAuth-Authorization.html)).
- For maximum peace of mind, it is always possible to fork this repository and/or host this web app yourself.

## Technical Details

- Based on:
  - [fschopp/project-planning-ui-for-you-track](https://github.com/fschopp/project-planning-ui-for-you-track) for the user-interface framework and for configuring the connection to YouTrack.
  - [fschopp/project-planning-for-you-track](https://github.com/fschopp/project-planning-ui-for-you-track) for the communication with YouTrack.
  - [adamhaile/S.js](https://github.com/adamhaile/S) and [adamhaile/Surplus](https://github.com/adamhaile/surplus) for reactive programming of the user interface.
  - [mdaines/viz.js](https://github.com/mdaines/viz.js) for running Graphviz in a browser.
  - [Graphviz](https://www.graphviz.org/) for the graph visualization.
- Written in TypeScript.
- Partial [source code documentation](https://fschopp.github.io/graphviz-for-you-track/doc/) available. Generated by TypeDoc.
- [Test coverage](https://coveralls.io/github/fschopp/graphviz-for-you-track?branch=master) is currently incomplete. However, the underlying package [fschopp/project-planning-for-you-track](https://github.com/fschopp/project-planning-for-you-track/) has complete test coverage.

## License

[Apache License 2.0](LICENSE)

## Build

- See the corresponding section in project [fschopp/project-planning-ui-for-you-track](https://github.com/fschopp/project-planning-ui-for-you-track/#build). The description there applies for this project as well.
