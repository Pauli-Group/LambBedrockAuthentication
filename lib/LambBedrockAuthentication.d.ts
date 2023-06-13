import { ethers } from "ethers";
import { BaseKeyTracker } from "./Common";
import KeyTrackerB from "./KeyTrackerB";
export interface ILambBedrockAutentication {
    createAccount(initialKeyCount: number): Promise<[string, BaseKeyTracker, string]>;
    verifyMessage(a: string, b: string): Promise<[boolean]>;
    signMessageAndPostSignature(a: string, b: string, c: BaseKeyTracker): Promise<any>;
    addKeys(a: string, b: BaseKeyTracker, amountToAdd: number): Promise<[ethers.BigNumber, number, number, boolean, string]>;
    removeKeys(a: string, b: KeyTrackerB, c: string[]): Promise<[number, number, boolean, string]>;
}
export default class LambBedrockAuthentication implements ILambBedrockAutentication {
    ecdsaSecret: string;
    rpcEndpoint: string;
    factoryAddress: string;
    confirmationTarget: number;
    constructor(_ecdsaSecret: string, _rpcEndpoint: string, _factoryAddress: string, _confirmationTarget: number);
    createAccount(initialKeyCount?: number): Promise<[string, BaseKeyTracker, string]>;
    verifyMessage(senderAuthAddress: string, message: string): Promise<[boolean]>;
    signMessageAndPostSignature(_message: string, accountAddress: string, keys: BaseKeyTracker): Promise<any>;
    addKeys(accountAddress: string, keys: BaseKeyTracker, amountToAdd?: number): Promise<[ethers.BigNumber, number, number, boolean, string]>;
    removeKeys(accountAddress: string, keys: KeyTrackerB, toRemove: string[]): Promise<[number, number, boolean, string]>;
}
