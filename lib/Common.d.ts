import Monad from "./Monad";
export type RandPair = [string, string];
export type PubPair = [string, string];
export type KeyPair = {
    pri: RandPair[];
    pub: PubPair[];
};
export declare const hash: (input: string) => string;
export declare const hash_b: (input: string) => string;
export declare const pubFromPri: (pri: [string, string][]) => PubPair[];
export type CompressedKeyPair = {
    secret: string;
    pkh: string;
};
export type AdvancedKeyPair = CompressedKeyPair & KeyPair;
export declare abstract class BaseKeyTracker {
    abstract get count(): number;
    abstract get exhausted(): boolean;
    abstract more(amount: number): KeyPair[];
    abstract getOne(): KeyPair;
    abstract getN(amount: number): KeyPair[];
    static pkhFromPublicKey(pub: PubPair[]): string;
}
export type Sig = string[];
/**
 * @name is_private_key
 * @description check the passed object looks like a lamport private key
 * @author William Doyle
 * @param key
 * @returns boolean if key looks like a valid lamport key pair
 */
export declare function is_private_key(key: RandPair[]): boolean;
/**
 * @name sign_hash
 * @author William Doyle
 * @param hmsg --> the hash of the message to be signed
 * @param pri --> the private key to sign the hash with
 * @returns Sig (a lamport signature)
 */
export declare function sign_hash(hmsg: string, pri: RandPair[]): Sig;
/**
 * @name verify_signed_hash
 * @author William Doyle
 * @param hmsg
 * @param sig
 * @param pub
 * @returns a boolean : true upon successful verification, false otherwise
 */
export declare function verify_signed_hash(hmsg: string, _sig: Sig, pub: PubPair[]): boolean;
declare const signHashWithMonadAndCurry: (privateKey: RandPair[]) => (hashToSign: string) => Monad<Sig>;
/**
 * @name getSelector
 * @description Gets the selector for a function in a contract
 * @date Febuary 14th 2023
 * @author William Doyle
 */
declare const getSelector: (contract: any, functionName: string) => any;
declare const checkSignature: (publicKey: PubPair[]) => (hashToSign: string) => (signature: Sig) => Monad<Sig>;
declare const convertSignatureForSolidity: (signature: string[]) => Monad<string[]>;
declare const hashBWithMonad: (data: string) => Monad<string>;
export { getSelector, checkSignature, convertSignatureForSolidity, signHashWithMonadAndCurry, hashBWithMonad };
