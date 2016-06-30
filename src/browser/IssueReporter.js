/* @flow */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {Effects, Task, html, thunk, forward} from 'reflex';
import {always, merge} from '../common/prelude';
import * as Style from '../common/style';
import * as Unknown from '../common/unknown';


import type {Address, DOM} from 'reflex'
import type {Result} from '../common/result'

export type Action =
  | { type: 'Dismiss' }
  | { type: 'Submit' }
  | { type: 'Crash', crash: Report }

const Dismiss = { type: "Dismiss" }
const Submit = { type: "Submit" }

export type Report = {
  description: string,
  url: string,
  backtrace: string
}

export class Model {
  reports: Array<Report>;
  constructor(reports:Array<Report>) {
    this.reports = reports
  }
}

export const init =
  (reports:Array<Report>=[]):[Model, Effects<Action>] =>
  [ new Model(reports)
  , Effects.none
  ]

export const update =
  (model:Model, action:Action):[Model, Effects<Action>] => {
    switch (action.type) {
      case 'Crash':
        return report(model, action.crash)
      case 'Dismiss':
        return dismiss(model)
      case 'Submit':
        return submit(model)
      default:
        return Unknown.update(model, action)
    }
  }

const report =
  (model, report) =>
  [ new Model([report, ...model.reports])
  , Effects.none
  ]

const dismiss =
  model =>
  [ new Model(model.reports.slice(1))
  , Effects.none
  ]

const submit =
  state => {
    const [report, ...reports] = state.reports
    const fx =
      ( report == null
      ? Effects.none
      : Effects.perform(openURLInDefaultBrowser(encodeReport(report)))
      )
    return [new Model(reports), fx]
  }

const encodeReport =
  report => {
    const body = encodeURIComponent(`
${report.description}
### URL:
${report.url}
### Backtrace:
\`\`\`
${report.backtrace}
\`\`\`
`);
  return `https://github.com/servo/servo/issues/new?title=${encodeURIComponent(report.description)}&body=${body}`;
  }

const openURLInDefaultBrowser = <error, value>
  (url:string):Task<error, value> =>
  new Task((succeed, fail) => {
    try {
      window.openURLInDefaultBrowser(url);
    } catch(error) {}
  })

export const view =
  (model:Model, address:Address<Action>):DOM =>
  thunk
  ( 'Browser/IssueReporter'
  , render
  , model
  , address
  )

export const render =
  (model:Model, address:Address<Action>):DOM =>
  ( model.reports.length > 0
  ? renderReport(model.reports[0], address)
  : html.dialog({ open: false })
  )

const renderReport =
  (report:Report, address:Address<Action>):DOM =>
  html.dialog({
    open: true,
    style: styleSheet.base
  }, [
    html.header({
      style: styleSheet.header
    }, [`Servo has encountered a problem: ${report.description} (${report.url})`]),
    html.button({
      style: styleSheet.dismissButton,
      onClick: forward(address, always(Dismiss))
    }, ["✕"]),
    html.pre({
      style: styleSheet.backtrace,
    }, [report.backtrace]),
    html.button({
      style: styleSheet.submitButton,
      onClick: forward(address, always(Submit))
    }, ["Click to submit report"]),
    html.aside({
      style: styleSheet.note
    }, ["github.com will open in your default browser, with a prefilled issue"]),
  ])

const styleSheet = Style.createSheet({
  base: {
    position: "absolute",
    bottom: "0px",
    left: "0px",
    padding: "0 10px",
    width: "100vw",
    height: "50vh",
    backgroundColor: "#FAFAFA",
    borderTop: "1px solid #CCC",
    zIndex: 10
  },
  dismissButton: {
    fontSize: "16px",
    position: "absolute",
    top: 0,
    right: "30px",
    cursor: "pointer",
    background: "transparent"
  },
  submitButton: {
    display: "inline-block",
    cursor: "pointer",
    margin: "10px 0",
    padding: "0 10px",
    textAlign: "center",
    lineHeight: "30px",
    borderRadius: "3px",
    backgroundImage: "linear-gradient(#fcfcfc, #eee)",
    border: "1px solid #d5d5d5",
  },
  backtrace: {
    height: "calc(50vh - 114px)",
    width: "calc(100vw - 40px)",
    padding: "10px",
    overflow: "hidden",
    backgroundColor: "white",
    border: "1px solid #EEE",
  },
  header: {
    display: "inline-block",
    height: "20px",
    width: "calc(100% - 40px)",
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    margin: "10px 0",
    fontWeight: "bold"
  },
  note: {
    display: "inline-block",
    margin: "10px 0",
    padding: "0 10px",
    lineHeight: "30px",
    color: "grey",
  }
})
