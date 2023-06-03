import { ethers } from "ethers"
import Monad from "./Monad"
import BigNumber from "bignumber.js"

export type RandPair = [string, string]
export type PubPair = [string, string]

export type KeyPair = {
    pri: RandPair[],
    pub: PubPair[],
}

export const hash = (input: string) => ethers.utils.keccak256(ethers.utils.toUtf8Bytes(input))
export const hash_b = (input: string) => ethers.utils.keccak256(input)
export const pubFromPri = (pri: [string, string][]) => pri.map(p => ([hash_b(p[0]), hash_b(p[1])])) as PubPair[]

export type CompressedKeyPair = {
    secret: string,
    pkh: string,
}

export type AdvancedKeyPair = CompressedKeyPair & KeyPair

export abstract class BaseKeyTracker {
    abstract get count(): number;
    abstract get exhausted(): boolean;
    abstract more(amount: number): KeyPair[];
    abstract getOne(): KeyPair; 
    abstract getN(amount: number): KeyPair[];

    static pkhFromPublicKey(pub: PubPair[]): string {
        return ethers.utils.keccak256(ethers.utils.solidityPack(['bytes32[2][256]'], [pub])) 
    }
}

export type Sig = string[]

/**
 * @name is_private_key
 * @description check the passed object looks like a lamport private key
 * @author William Doyle
 * @param key 
 * @returns boolean if key looks like a valid lamport key pair
 */
export function is_private_key(key: RandPair[]): boolean {
    if (key.length !== 256)
        return false
    return true
}

/**
 * @name sign_hash
 * @author William Doyle 
 * @param hmsg --> the hash of the message to be signed 
 * @param pri --> the private key to sign the hash with 
 * @returns Sig (a lamport signature)
 */
export function sign_hash(hmsg: string, pri: RandPair[]): Sig {
    if (!is_private_key(pri))
        throw new Error('invalid private key')

    const msg_hash_bin = new BigNumber(hmsg, 16).toString(2).padStart(256, '0')

    if (msg_hash_bin.length !== 256)
        throw new Error(`invalid message hash length: ${msg_hash_bin.length} --> ${msg_hash_bin}`)

    const sig: Sig = ([...msg_hash_bin] as ('0' | '1')[]).map((el: '0' | '1', i: number) => pri[i][el])
    return sig
}

/**
 * @name verify_signed_hash
 * @author William Doyle
 * @param hmsg 
 * @param sig 
 * @param pub 
 * @returns a boolean : true upon successful verification, false otherwise
 */
export function verify_signed_hash(hmsg: string, _sig: Sig, pub: PubPair[]): boolean {
    const msg_hash_bin = new BigNumber(hmsg, 16).toString(2).padStart(256, '0')
    const pub_selection = ([...msg_hash_bin] as ('0' | '1')[]).map((way /** 'way' as in which way should we go through the public key */: '0' | '1', i: number) => pub[i][way])

    const sig = _sig.map((element: string) => {
        if (element.startsWith('0x'))
            return element
        return `0x${element}`
    })

    for (let i = 0; i < pub_selection.length; i++)
        if (pub_selection[i] !== hash_b(sig[i]))
            return false

    return true
}


const signHashWithMonadAndCurry = (privateKey: RandPair[]) => (hashToSign: string) => new Monad(sign_hash(hashToSign, privateKey))

/**
 * @name getSelector
 * @description Gets the selector for a function in a contract
 * @date Febuary 14th 2023
 * @author William Doyle 
 */
const getSelector = (contract: any, functionName: string) => {
    const iface = contract?.interface ?? new ethers.utils.Interface(contract.abi)
    const fragment = iface.getFunction(functionName)
    return iface.getSighash(fragment)
}

const checkSignature = (publicKey: PubPair[]) => (hashToSign: string) => (signature: Sig) => {
    const isValid = verify_signed_hash(hashToSign, signature, publicKey)
    if (!isValid)
        throw new Error('Invalid signature')
    return new Monad(signature)
}

const convertSignatureForSolidity = (signature: string[]) => new Monad(signature.map((s: string) => {
    if (s.startsWith('0x'))
        return s
    return `0x${s}`
}))

const hashBWithMonad = (data: string) => new Monad(hash_b(data))
export { getSelector, checkSignature, convertSignatureForSolidity, signHashWithMonadAndCurry, hashBWithMonad}