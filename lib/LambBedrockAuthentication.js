"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const Common_1 = require("./Common");
const KeyTrackerB_1 = __importStar(require("./KeyTrackerB"));
const LambBedrockAuthenticationFactory_json_1 = __importDefault(require("./contracts/LambBedrockAuthenticationFactory.json"));
const LambBedrockAuthentication_json_1 = __importDefault(require("./contracts/LambBedrockAuthentication.json"));
const Monad_1 = __importDefault(require("./Monad"));
class LambBedrockAuthentication {
    constructor(_ecdsaSecret, _rpcEndpoint, _factoryAddress, _confirmationTarget) {
        this.ecdsaSecret = "";
        this.rpcEndpoint = "";
        this.factoryAddress = "";
        this.confirmationTarget = 0;
        this.ecdsaSecret = _ecdsaSecret;
        this.rpcEndpoint = _rpcEndpoint;
        this.factoryAddress = _factoryAddress;
        this.confirmationTarget = _confirmationTarget;
    }
    createAccount() {
        return __awaiter(this, void 0, void 0, function* () {
            const keyTracker = new KeyTrackerB_1.default();
            const initialKeys = keyTracker.more(200);
            const initialKeyHashes = initialKeys.map(key => key.pkh);
            const provider = new ethers_1.ethers.providers.JsonRpcProvider(this.rpcEndpoint);
            const caller = (new ethers_1.ethers.Wallet(this.ecdsaSecret)).connect(provider);
            const callersToApprove = [
                caller.address,
                "0x4f171744973047296d90e7828676F4972faFB200", // pauligroup.eth
            ];
            const factory = new ethers_1.ethers.Contract(this.factoryAddress, LambBedrockAuthenticationFactory_json_1.default.abi, caller);
            const counterfactual = yield factory.getAddress(initialKeyHashes, callersToApprove);
            const tx = yield factory.createAccount(initialKeyHashes, callersToApprove);
            const receipt = yield tx.wait(this.confirmationTarget);
            {
                // SANITY CHECK: get the deployed address from the event logs - future iterations will use CREATE2 and the address will be computed counterfactually 
                const creationEvent = receipt.logs.find((log) => log.topics[0] === factory.interface.getEventTopic('AccountCreated'));
                const deployedAddress = `0x${creationEvent.topics[1].slice(26)}`;
                if (deployedAddress.toLowerCase() !== counterfactual.toLowerCase())
                    throw new Error(`Counterfactual address ${counterfactual} does not match deployed address ${deployedAddress}`);
            }
            return [counterfactual, keyTracker, tx.hash];
        });
    }
    verifyMessage(senderAuthAddress, message) {
        return __awaiter(this, void 0, void 0, function* () {
            const provider = new ethers_1.ethers.providers.JsonRpcProvider(this.rpcEndpoint);
            const accountContract = new ethers_1.ethers.Contract(senderAuthAddress, LambBedrockAuthentication_json_1.default.abi, provider);
            const messageHash = ethers_1.ethers.utils.keccak256(ethers_1.ethers.utils.solidityPack(['string'], [message]));
            const result = yield accountContract.isValidSignature(messageHash, '0x');
            const isValid = result === '0x1626ba7e';
            return [
                isValid,
            ];
        });
    }
    // NOTICE: it matters a lot here that objects in typescript are passed by reference. If you sign a message with 
    //         the keytracker, the keytracker needs to modify its internal state to reflect that the key has been 
    //         used. If 2 messages are signed with the same key by mistake somehow, ~75% of the secret will have 
    //         been leaked. If neither of these messages are finalized on the blockchain this is especially bad, as 
    //         a kean observer could use the leaked secret to sign a carfully crafted fraudulent message.
    signMessageAndPostSignature(_message, accountAddress, keys) {
        return __awaiter(this, void 0, void 0, function* () {
            const provider = new ethers_1.ethers.providers.JsonRpcProvider(this.rpcEndpoint);
            const caller = (new ethers_1.ethers.Wallet(this.ecdsaSecret)).connect(provider);
            const accountContract = new ethers_1.ethers.Contract(accountAddress, LambBedrockAuthentication_json_1.default.abi, caller);
            const signingKeys = keys.getOne();
            const message = ethers_1.ethers.utils.keccak256(ethers_1.ethers.utils.solidityPack(['string'], [_message]));
            const selector = (0, Common_1.getSelector)(accountContract, 'endorseMessage');
            const hashToSign = Monad_1.default.of(ethers_1.ethers.utils.keccak256(ethers_1.ethers.utils.solidityPack(['bytes32', 'bytes4'], [message, selector])));
            const signature = hashToSign
                .bind((0, Common_1.signHashWithMonadAndCurry)(signingKeys.pri))
                .bind((0, Common_1.checkSignature)(signingKeys.pub)(hashToSign.unwrap()))
                .bind(Common_1.convertSignatureForSolidity);
            const tx = yield accountContract.endorseMessage(message, signingKeys.pub, signature.unwrap());
            const receipt = yield tx.wait(this.confirmationTarget);
            const remainingLocal = keys.count;
            const remainingOnContract = (yield accountContract.liveKeyCount()).toNumber(); // should be a number JavaScript can handle
            return [
                message,
                remainingLocal,
                remainingOnContract,
                remainingLocal === remainingOnContract,
                tx.hash
            ];
        });
    }
    // NOTICE: again, it matters a lot here that objects in typescript are passed by reference
    addKeys(accountAddress, keys) {
        return __awaiter(this, void 0, void 0, function* () {
            const provider = new ethers_1.ethers.providers.JsonRpcProvider(this.rpcEndpoint);
            const caller = (new ethers_1.ethers.Wallet(this.ecdsaSecret)).connect(provider);
            const accountContract = new ethers_1.ethers.Contract(accountAddress, LambBedrockAuthentication_json_1.default.abi, caller);
            const signingKeys = keys.getOne();
            const keysToAdd = keys.more(200);
            const publicKeyHashes = keysToAdd.map(key => Common_1.BaseKeyTracker.pkhFromPublicKey(key.pub));
            const fee = yield accountContract.getKeyAdditionFee();
            // ensure we can pay the fee
            const balance = yield caller.getBalance();
            if (balance.lt(fee))
                throw new Error(`Insufficient balance to pay fee. Balance: ${ethers_1.ethers.utils.formatEther(balance)}, Fee: ${ethers_1.ethers.utils.formatEther(fee)}`);
            const selector = (0, Common_1.getSelector)(accountContract, 'addPublicKeyHashes');
            const prep = (publicKeyHashes) => new Monad_1.default(ethers_1.ethers.utils.solidityPack(['bytes32[]', 'bytes4'], [publicKeyHashes, selector]));
            const hashToSign = new Monad_1.default(publicKeyHashes)
                .bind(prep)
                .bind(Common_1.hashBWithMonad);
            const signature = hashToSign
                .bind((0, Common_1.signHashWithMonadAndCurry)(signingKeys.pri))
                .bind((0, Common_1.checkSignature)(signingKeys.pub)(hashToSign.unwrap()))
                .bind(Common_1.convertSignatureForSolidity);
            const tx = yield accountContract.addPublicKeyHashes(publicKeyHashes, signingKeys.pub, signature.unwrap(), { value: fee });
            const receipt = yield tx.wait(this.confirmationTarget);
            const remainingLocal = keys.count;
            const remainingOnContract = (yield accountContract.liveKeyCount()).toNumber();
            return [
                fee,
                remainingLocal,
                remainingOnContract,
                remainingLocal === remainingOnContract,
                tx.hash
            ];
        });
    }
    // NOTICE: again, it matters a lot here that objects in typescript are passed by reference
    removeKeys(accountAddress, keys, toRemove) {
        return __awaiter(this, void 0, void 0, function* () {
            const signingKeys = keys.getOne();
            const signingPKH = Common_1.BaseKeyTracker.pkhFromPublicKey(signingKeys.pub);
            if (toRemove.includes(signingPKH))
                throw new Error(`Cannot remove signing key`);
            {
                // find the keys we want to remove from the local key tracker and remove them
                const allPKHs = keys.keys.map(KeyTrackerB_1.uncompressLamport).map(key => key.pkh);
                const targetIndices = allPKHs.flatMap((pkh, i) => toRemove.includes(pkh) ? [i] : []);
                keys.keys = keys.keys.filter((_, i) => !targetIndices.includes(i));
            }
            const provider = new ethers_1.ethers.providers.JsonRpcProvider(this.rpcEndpoint);
            const caller = (new ethers_1.ethers.Wallet(this.ecdsaSecret)).connect(provider);
            const accountContract = new ethers_1.ethers.Contract(accountAddress, LambBedrockAuthentication_json_1.default.abi, caller);
            const selector = (0, Common_1.getSelector)(accountContract, 'removePublicKeyHashes');
            const prep = (publicKeyHashes) => new Monad_1.default(ethers_1.ethers.utils.solidityPack(['bytes32[]', 'bytes4'], [publicKeyHashes, selector]));
            const hashToSign = prep(toRemove)
                .bind(Common_1.hashBWithMonad);
            const signature = hashToSign
                .bind((0, Common_1.signHashWithMonadAndCurry)(signingKeys.pri))
                .bind((0, Common_1.checkSignature)(signingKeys.pub)(hashToSign.unwrap()))
                .bind(Common_1.convertSignatureForSolidity);
            const tx = yield accountContract.removePublicKeyHashes(toRemove, signingKeys.pub, signature.unwrap());
            const receipt = yield tx.wait(this.confirmationTarget);
            const remainingLocal = keys.count;
            const remainingOnContract = (yield accountContract.liveKeyCount()).toNumber();
            return [
                remainingLocal,
                remainingOnContract,
                remainingLocal === remainingOnContract,
                tx.hash
            ];
        });
    }
}
exports.default = LambBedrockAuthentication;
