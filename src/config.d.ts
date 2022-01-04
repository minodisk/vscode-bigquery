export type Config = {
  readonly keyFilename: string;
  readonly projectId: string | undefined;
  readonly location: string | undefined;
  readonly useLegacySql: boolean;
  readonly maximumBytesBilled: string | undefined;
  readonly queryValidation: {
    readonly enabled: boolean;
    readonly debounceInterval: number;
    readonly languageIds: Array<string>;
    readonly extensions: Array<string>;
  };
  readonly format: {
    readonly type: "table" | "markdown" | "json" | "json-lines" | "csv";
    readonly csv: {
      readonly header: boolean;
      readonly delimiter: string;
    };
  };
  readonly output: {
    readonly type: "output" | "file";
    readonly file: {
      readonly path: string;
    };
  };
};
