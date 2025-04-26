export declare class DeviceContext {
    deviceOS?: string;
    merchantCallBackScheme?: string;
    constructor(deviceOS?: string, merchantCallBackScheme?: string);
    static builder(): DeviceContextBuilder;
}
declare class DeviceContextBuilder {
    private _deviveOS?;
    private _merchantCallBackScheme?;
    /**
     * SETTERS
     */
    deviceOS: (deviceOS?: string) => DeviceContextBuilder;
    merchantCallBackScheme: (merchantCallBackScheme?: string) => DeviceContextBuilder;
    build: () => DeviceContext;
}
export {};
