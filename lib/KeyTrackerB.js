"use strict";
// AKM -> Advanced Key Managagement
Object.defineProperty(exports, "__esModule", { value: true });
exports.mk_compressed_key_pair = exports.compressLamport = exports.uncompressLamport = void 0;
const ethers_1 = require("ethers");
const Common_1 = require("./Common");
// FOR EASY READING
const COMBINE = (a, b) => ethers_1.ethers.utils.solidityPack(['uint256', 'uint256'], [a, b]);
const HASH = (a) => ethers_1.ethers.utils.keccak256(a);
const GENERATE_INITIAL_SECRET = () => ethers_1.ethers.utils.keccak256(ethers_1.ethers.utils.toUtf8Bytes(ethers_1.ethers.BigNumber.from(ethers_1.ethers.utils.randomBytes(32)).toHexString()));
const dropFirstTwoChars = (a) => a.slice(2);
/**
 * @name uncompressLamport
 * @description Uncompresses a compressed key pair
 * @date Febuary 15th 2023
 * @author William Doyle
 */
function uncompressLamport(compressed) {
    // 1. generate 512 intermediate secrets
    const intermediate_secrets = Array.from({ length: 512 }).map((_, index) => HASH(COMBINE(compressed.secret, index.toString())));
    // const intermediate_secrets: string[] = Array.from({ length: 512 }).map((_, index: number) => dropFirstTwoChars(HASH(COMBINE(compressed.secret, index.toString()))))
    // 2. pair them up
    const leftIntermediateSecrets = intermediate_secrets.filter((_, i) => i % 2 === 0);
    const rightIntermediateSecrets = intermediate_secrets.filter((_, i) => i % 2 === 1);
    const pri = leftIntermediateSecrets.map((l, i) => [l, rightIntermediateSecrets[i]]);
    // 3. derive public key
    const pub = (0, Common_1.pubFromPri)(pri.map(p => [p[0], p[1]]));
    // 4. derive hash of public key
    const pkh = Common_1.BaseKeyTracker.pkhFromPublicKey(pub);
    // 5. verify hash matches
    if (pkh !== compressed.pkh)
        throw new Error('Public Key Hash Does Not Match Secret');
    // 6. return key pair  
    return Object.assign(Object.assign({}, compressed), { pri,
        pub });
}
exports.uncompressLamport = uncompressLamport;
/**
 * @name compressLamport
 * @description Compresses a key pair to only the secret and the public key hash
 * @date Febuary 15th 2023
 * @author William Doyle
 */
function compressLamport(keyPair) {
    return {
        secret: keyPair.secret,
        pkh: keyPair.pkh
    };
}
exports.compressLamport = compressLamport;
function mk_compressed_key_pair() {
    // generate single 32 bytes secret
    const secret = GENERATE_INITIAL_SECRET();
    // derive 512 intermediate secrets
    const intermediate_secrets = Array.from({ length: 512 }).map((_, index) => HASH(COMBINE(secret, index.toString())));
    // const intermediate_secrets: string[] = Array.from({ length: 512 }).map((_, index: number) => dropFirstTwoChars(HASH(COMBINE(secret, index.toString()))))
    // pair them up
    const leftIntermediateSecrets = intermediate_secrets.filter((_, i) => i % 2 === 0);
    const rightIntermediateSecrets = intermediate_secrets.filter((_, i) => i % 2 === 1);
    // zip them up
    const pri = leftIntermediateSecrets.map((l, i) => [l, rightIntermediateSecrets[i]]);
    // derive public key
    const pub = (0, Common_1.pubFromPri)(pri.map(p => [p[0], p[1]]));
    // derive hash of public key
    const pkh = Common_1.BaseKeyTracker.pkhFromPublicKey(pub);
    return {
        pri,
        pub,
        secret,
        pkh
    };
}
exports.mk_compressed_key_pair = mk_compressed_key_pair;
/**
 * @name KeyTrackerB
 * @description A class that keeps track of keys and allows you to get them
 * @date Febuary 15th 2023
 * @author William Doyle
 */
class KeyTrackerB extends Common_1.BaseKeyTracker {
    constructor() {
        super(...arguments);
        this.keys = [];
    }
    get count() {
        return this.keys.length;
    }
    get exhausted() {
        return this.count === 0;
    }
    more(amount = 2) {
        const keys = Array.from({ length: amount }, () => mk_compressed_key_pair());
        const asCompressed = keys.map(k => compressLamport(k));
        this.keys.push(...asCompressed); // save as compressed
        return keys; // return as uncompressed
    }
    getOne() {
        const returnValue = this.keys.shift();
        if (returnValue === undefined)
            throw new Error('No keys left');
        return uncompressLamport(returnValue);
    }
    getN(amount) {
        return this.keys.splice(0, amount).map(k => uncompressLamport(k));
    }
}
exports.default = KeyTrackerB;
