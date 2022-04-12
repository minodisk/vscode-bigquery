import { PassThrough } from "stream";
import {
  createCSVFormatter,
  createFileOutput,
  createFlat,
  createLogOutput,
  createMarkdownFormatter,
  createTableFormatter,
} from ".";
import { createViewerOutput } from "./output";
import jobInfo from "./jobInfo.json";
import t from "./tableInfo.json";
import { TableInfo } from "./types";

const tableInfo = t as TableInfo;

const viewerOptions = {
  async postMessage() {
    return true;
  },
};

describe("output", () => {
  describe("createViewerOutput", () => {
    it("should post close event to webview if output is closed", async () => {
      const postMessage = jest.fn();
      const output = createViewerOutput({
        postMessage,
      });
      await output.open();
      await output.close();
      expect(postMessage).toBeCalledWith({
        source: "bigquery-runner",
        payload: {
          event: "close",
        },
      });
    });

    it("should not throw an error if it is written before being opened", async () => {
      const output = createViewerOutput(viewerOptions);
      await output.writeRows({
        structs: [],
        flat: createFlat([]),
        jobInfo,
        tableInfo,
        edgeInfo: {
          hasPrev: false,
          hasNext: false,
          rowNumberStart: BigInt(1),
          rowNumberEnd: BigInt(1),
        },
      });
    });

    it("should not throw an error if it is closed before being opened", async () => {
      const output = createViewerOutput(viewerOptions);
      await output.close();
    });

    it("should not throw an error if it is disposed before being opened", async () => {
      const output = createViewerOutput(viewerOptions);
      await output.dispose();
    });

    it("should be format", async () => {
      const flat = createFlat([
        { name: "foo", type: "BOOLEAN", mode: "REQUIRED" },
      ]);
      const messages: Array<unknown> = [];
      const output = createViewerOutput({
        async postMessage(message) {
          messages.push(message);
          return true;
        },
      });
      await output.open();
      await output.writeHeads({ flat });
      await output.writeRows({
        structs: [
          {
            foo: true,
          },
        ],
        flat,
        jobInfo,
        tableInfo,
        edgeInfo: {
          hasPrev: false,
          hasNext: false,
          rowNumberStart: BigInt(1),
          rowNumberEnd: BigInt(1),
        },
      });
      expect(messages).toEqual([
        {
          source: "bigquery-runner",
          payload: {
            event: "open",
          },
        },
        {
          source: "bigquery-runner",
          payload: {
            event: "rows",
            payload: {
              header: ["foo"],
              rows: [
                {
                  rowNumber: "1",
                  rows: [
                    [
                      {
                        id: "foo",
                        value: true,
                      },
                    ],
                  ],
                },
              ],
              jobInfo,
              tableInfo,
              edgeInfo: {
                hasPrev: false,
                hasNext: false,
                rowNumberStart: "1",
                rowNumberEnd: "1",
              },
            },
          },
        },
      ]);
    });
  });

  describe("createLogOutput", () => {
    describe("format markdown", () => {
      it("should be output", async () => {
        const flat = createFlat([
          { name: "foo", type: "BOOLEAN", mode: "REQUIRED" },
        ]);
        let actual = "";
        const output = createLogOutput({
          formatter: createMarkdownFormatter(),
          outputChannel: {
            show() {
              // do nothing
            },
            append(value) {
              actual += value;
            },
          },
        });
        await output.open();
        await output.writeHeads({
          flat,
        });
        await output.writeRows({
          structs: [
            {
              foo: true,
            },
          ],
          flat,
          jobInfo,
          tableInfo,
          edgeInfo: {
            hasPrev: false,
            hasNext: false,
            rowNumberStart: BigInt(1),
            rowNumberEnd: BigInt(1),
          },
        });
        await output.close();
        expect(actual).toEqual(
          `|foo|
|---|
|true|
`
        );
      });
    });
  });

  describe("createFileOutput", () => {
    it("should end the stream when it is disposed", async () => {
      let actual = "";
      const stream = new PassThrough();
      stream.on("data", (chunk) => (actual += chunk.toString("utf-8")));
      const output = createFileOutput({
        formatter: createCSVFormatter({
          options: {},
        }),
        stream,
      });
      await output.open();
      expect(stream.writableEnded).toEqual(false);
      output.dispose();
      expect(stream.writableEnded).toEqual(true);
    });

    it("should be output table", async () => {
      const flat = createFlat([
        { name: "foo", type: "STRING", mode: "REQUIRED" },
        { name: "bar", type: "BOOL", mode: "REQUIRED" },
      ]);
      let actual = "";
      const stream = new PassThrough();
      stream.on("data", (chunk) => (actual += chunk.toString("utf-8")));
      const output = createFileOutput({
        formatter: createTableFormatter(),
        stream,
      });
      await output.open();
      await output.writeHeads({
        flat,
      });
      await output.writeRows({
        structs: [
          {
            foo: "FOO",
            bar: true,
          },
          {
            foo: "FOO2",
            bar: false,
          },
        ],
        flat,
        jobInfo,
        tableInfo,
        edgeInfo: {
          hasPrev: false,
          hasNext: false,
          rowNumberStart: BigInt(1),
          rowNumberEnd: BigInt(1),
        },
      });
      await output.close();
      expect(actual).toEqual(
        `
foo   bar  
----  -----
FOO   true 
FOO2  false
`.trimStart()
      );
    });

    it("should be output markdown", async () => {
      const flat = createFlat([
        { name: "foo", type: "STRING", mode: "REQUIRED" },
        { name: "bar", type: "BOOL", mode: "REQUIRED" },
      ]);
      let actual = "";
      const stream = new PassThrough();
      stream.on("data", (chunk) => (actual += chunk.toString("utf-8")));
      const output = createFileOutput({
        formatter: createMarkdownFormatter(),
        stream,
      });
      await output.open();
      await output.writeHeads({
        flat,
      });
      await output.writeRows({
        structs: [
          {
            foo: "FOO",
            bar: true,
          },
          {
            foo: "FOO2",
            bar: false,
          },
        ],
        flat,
        jobInfo,
        tableInfo,
        edgeInfo: {
          hasPrev: false,
          hasNext: false,
          rowNumberStart: BigInt(1),
          rowNumberEnd: BigInt(1),
        },
      });
      await output.close();
      expect(actual).toEqual(
        `
|foo|bar|
|---|---|
|FOO|true|
|FOO2|false|
`.trimStart()
      );
    });

    it("should be output CSV", async () => {
      const flat = createFlat([
        { name: "foo", type: "STRING", mode: "REQUIRED" },
        { name: "bar", type: "BOOL", mode: "REQUIRED" },
      ]);
      let actual = "";
      const stream = new PassThrough();
      stream.on("data", (chunk) => (actual += chunk.toString("utf-8")));
      const output = createFileOutput({
        formatter: createCSVFormatter({
          options: {},
        }),
        stream,
      });
      await output.open();
      await output.writeHeads({
        flat,
      });
      await output.writeRows({
        structs: [
          {
            foo: "FOO",
            bar: true,
          },
          {
            foo: "FOO2",
            bar: false,
          },
        ],
        flat,
        jobInfo,
        tableInfo,
        edgeInfo: {
          hasPrev: false,
          hasNext: false,
          rowNumberStart: BigInt(1),
          rowNumberEnd: BigInt(1),
        },
      });
      await output.close();
      expect(actual).toEqual(
        `FOO,true
FOO2,false
`
      );
    });
  });
});
