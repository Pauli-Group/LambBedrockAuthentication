"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashBWithMonad = exports.signHashWithMonadAndCurry = exports.convertSignatureForSolidity = exports.checkSignature = exports.getSelector = exports.verify_signed_hash = exports.sign_hash = exports.is_private_key = exports.BaseKeyTracker = exports.pubFromPri = exports.hash_b = exports.hash = void 0;
const ethers_1 = require("ethers");
const Monad_1 = __importDefault(require("./Monad"));
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const hash = (input) => ethers_1.ethers.utils.keccak256(ethers_1.ethers.utils.toUtf8Bytes(input));
exports.hash = hash;
const hash_b = (input) => ethers_1.ethers.utils.keccak256(input);
exports.hash_b = hash_b;
const pubFromPri = (pri) => pri.map(p => ([(0, exports.hash_b)(p[0]), (0, exports.hash_b)(p[1])]));
exports.pubFromPri = pubFromPri;
class BaseKeyTracker {
    static pkhFromPublicKey(pub) {
        return ethers_1.ethers.utils.keccak256(ethers_1.ethers.utils.solidityPack(['bytes32[2][256]'], [pub]));
    }
}
exports.BaseKeyTracker = BaseKeyTracker;
/**
 * @name is_private_key
 * @description check the passed object looks like a lamport private key
 * @author William Doyle
 * @param key
 * @returns boolean if key looks like a valid lamport key pair
 */
function is_private_key(key) {
    if (key.length !== 256)
        return false;
    return true;
}
exports.is_private_key = is_private_key;
/**
 * @name sign_hash
 * @author William Doyle
 * @param hmsg --> the hash of the message to be signed
 * @param pri --> the private key to sign the hash with
 * @returns Sig (a lamport signature)
 */
function sign_hash(hmsg, pri) {
    if (!is_private_key(pri))
        throw new Error('invalid private key');
    const msg_hash_bin = new bignumber_js_1.default(hmsg, 16).toString(2).padStart(256, '0');
    if (msg_hash_bin.length !== 256)
        throw new Error(`invalid message hash length: ${msg_hash_bin.length} --> ${msg_hash_bin}`);
    const sig = [...msg_hash_bin].map((el, i) => pri[i][el]);
    return sig;
}
exports.sign_hash = sign_hash;
/**
 * @name verify_signed_hash
 * @author William Doyle
 * @param hmsg
 * @param sig
 * @param pub
 * @returns a boolean : true upon successful verification, false otherwise
 */
function verify_signed_hash(hmsg, _sig, pub) {
    const msg_hash_bin = new bignumber_js_1.default(hmsg, 16).toString(2).padStart(256, '0');
    const pub_selection = [...msg_hash_bin].map((way /** 'way' as in which way should we go through the public key */, i) => pub[i][way]);
    const sig = _sig.map((element) => {
        if (element.startsWith('0x'))
            return element;
        return `0x${element}`;
    });
    for (let i = 0; i < pub_selection.length; i++)
        if (pub_selection[i] !== (0, exports.hash_b)(sig[i]))
            return false;
    return true;
}
exports.verify_signed_hash = verify_signed_hash;
const signHashWithMonadAndCurry = (privateKey) => (hashToSign) => new Monad_1.default(sign_hash(hashToSign, privateKey));
exports.signHashWithMonadAndCurry = signHashWithMonadAndCurry;
/**
 * @name getSelector
 * @description Gets the selector for a function in a contract
 * @date Febuary 14th 2023
 * @author William Doyle
 */
const getSelector = (contract, functionName) => {
    var _a;
    const iface = (_a = contract === null || contract === void 0 ? void 0 : contract.interface) !== null && _a !== void 0 ? _a : new ethers_1.ethers.utils.Interface(contract.abi);
    const fragment = iface.getFunction(functionName);
    return iface.getSighash(fragment);
};
exports.getSelector = getSelector;
const checkSignature = (publicKey) => (hashToSign) => (signature) => {
    const isValid = verify_signed_hash(hashToSign, signature, publicKey);
    if (!isValid)
        throw new Error('Invalid signature');
    return new Monad_1.default(signature);
};
exports.checkSignature = checkSignature;
const convertSignatureForSolidity = (signature) => new Monad_1.default(signature.map((s) => {
    if (s.startsWith('0x'))
        return s;
    return `0x${s}`;
}));
exports.convertSignatureForSolidity = convertSignatureForSolidity;
const hashBWithMonad = (data) => new Monad_1.default((0, exports.hash_b)(data));
exports.hashBWithMonad = hashBWithMonad;
