export declare class MetaInfo {
    udf1?: string;
    udf2?: string;
    udf3?: string;
    udf4?: string;
    udf5?: string;
    constructor(udf1: string, udf2: string, udf3: string, udf4: string, udf5: string);
    static builder(): MetaInfoBuilder;
}
declare class MetaInfoBuilder {
    private _udf1;
    private _udf2;
    private _udf3;
    private _udf4;
    private _udf5;
    /**
     * SETTERS
     */
    udf1: (udf1: string) => MetaInfoBuilder;
    udf2: (udf2: string) => MetaInfoBuilder;
    udf3: (udf3: string) => MetaInfoBuilder;
    udf4: (udf4: string) => MetaInfoBuilder;
    udf5: (udf5: string) => MetaInfoBuilder;
    build: () => MetaInfo;
}
export {};
