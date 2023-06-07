import { BaseKeyTracker, KeyPair } from "./Common";
export type CompressedKeyPair = {
    secret: string;
    pkh: string;
};
export type AdvancedKeyPair = CompressedKeyPair & KeyPair;
/**
 * @name uncompressLamport
 * @description Uncompresses a compressed key pair
 * @date Febuary 15th 2023
 * @author William Doyle
 */
export declare function uncompressLamport(compressed: CompressedKeyPair): AdvancedKeyPair;
/**
 * @name compressLamport
 * @description Compresses a key pair to only the secret and the public key hash
 * @date Febuary 15th 2023
 * @author William Doyle
 */
export declare function compressLamport(keyPair: AdvancedKeyPair): CompressedKeyPair;
export declare function mk_compressed_key_pair(): AdvancedKeyPair;
/**
 * @name KeyTrackerB
 * @description A class that keeps track of keys and allows you to get them
 * @date Febuary 15th 2023
 * @author William Doyle
 */
export default class KeyTrackerB extends BaseKeyTracker {
    keys: CompressedKeyPair[];
    get count(): number;
    get exhausted(): boolean;
    more(amount?: number): AdvancedKeyPair[];
    getOne(): AdvancedKeyPair;
    getN(amount: number): AdvancedKeyPair[];
}
