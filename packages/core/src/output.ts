import { Writable } from "stream";
import { Flat, Formatter } from ".";
import { toSerializableEdgeInfo } from "./bigquery";
import {
  CloseEvent,
  Data,
  EdgeInfo,
  JobInfo,
  OpenEvent,
  RowsEvent,
  Struct,
  TableInfo,
} from "./types";

export type Output = {
  readonly open: () => Promise<string | void>;
  readonly writeHeads: (props: { readonly flat: Flat }) => Promise<unknown>;
  readonly writeRows: (params: {
    readonly structs: Array<Struct>;
    readonly flat: Flat;
    readonly jobInfo: JobInfo;
    readonly tableInfo: TableInfo;
    readonly edgeInfo: EdgeInfo;
  }) => Promise<unknown>;
  readonly close: () => Promise<void>;
  readonly dispose: () => unknown;
};

// export type WebviewPanel = {
//   readonly webview: {
//     html: string;
//     postMessage(message: unknown): Thenable<boolean>;
//   };
//   dispose(): unknown;
//   onDidDispose(
//     callback: () => void,
//     hoge: unknown,
//     subscriptions: Array<{ dispose(): unknown }>
//   ): void;
// };

export function createViewerOutput({
  postMessage,
}: {
  postMessage(message: unknown): Thenable<boolean>;
}): Output {
  return {
    async open() {
      await postMessage({
        source: "bigquery-runner",
        payload: {
          event: "open",
        },
      } as Data<OpenEvent>);
    },

    async writeHeads() {
      // do nothing
    },

    async writeRows({ structs, flat, jobInfo, tableInfo, edgeInfo }) {
      await postMessage({
        source: "bigquery-runner",
        payload: {
          event: "rows",
          payload: {
            header: flat.heads.map(({ id }) => id),
            rows: flat.toRows({
              structs,
              rowNumber: edgeInfo.rowNumberStart,
            }),
            jobInfo,
            tableInfo,
            edgeInfo: toSerializableEdgeInfo(edgeInfo),
          },
        },
      } as Data<RowsEvent>);
    },

    async close() {
      await postMessage({
        source: "bigquery-runner",
        payload: {
          event: "close",
        },
      } as Data<CloseEvent>);
    },

    dispose() {
      // do nothing
    },
  };
}

export function createLogOutput({
  formatter,
  outputChannel,
}: {
  readonly formatter: Formatter;
  readonly outputChannel: {
    show(preserveFocus: boolean): void;
    append(value: string): void;
  };
}): Output {
  return {
    async open() {
      outputChannel.show(true);
    },
    async writeHeads({ flat }) {
      outputChannel.append(formatter.header({ flat }));
    },
    async writeRows({ structs: rows, flat }) {
      outputChannel.append(
        await formatter.rows({ structs: rows, rowNumber: 0n, flat })
      );
    },
    async close() {
      outputChannel.append(formatter.footer());
    },
    async dispose() {
      // do nothing
    },
  };
}

export function createFileOutput({
  formatter,
  stream,
}: {
  readonly formatter: Formatter;
  readonly stream: Writable;
}): Output {
  return {
    async open() {
      // do nothing
    },
    async writeHeads({ flat }) {
      const res = formatter.header({ flat });
      if (res) {
        stream.write(res);
      }
    },
    async writeRows({ structs: rows, flat }) {
      stream.write(
        await formatter.rows({ structs: rows, rowNumber: 0n, flat })
      );
    },
    async close() {
      stream.write(formatter.footer());
      await new Promise((resolve, reject) => {
        stream.on("error", reject).on("finish", resolve).end();
      });
    },
    async dispose() {
      stream.end();
    },
  };
}
