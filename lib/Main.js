"use strict";
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
const KeyTrackerB_1 = require("./KeyTrackerB");
const ethers_1 = require("ethers");
require("dotenv/config");
const LambBedrockAuthentication_1 = __importDefault(require("./LambBedrockAuthentication"));
const getCurrentState = (secret, rpcEndpoint) => __awaiter(void 0, void 0, void 0, function* () {
    const provider = new ethers_1.ethers.providers.JsonRpcProvider(rpcEndpoint);
    const caller = (new ethers_1.ethers.Wallet(secret)).connect(provider);
    return {
        balance: yield caller.getBalance(),
    };
});
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const initialState = yield getCurrentState(process.env.ECDSA_SECRET, process.env.RPC_ENDPOINT);
        const lba = new LambBedrockAuthentication_1.default(process.env.ECDSA_SECRET, process.env.RPC_ENDPOINT, process.env.WALLET_FACTORY, 1);
        // STEP 1: Create Account
        console.log(`STEP 1: Create Account`);
        const [address, kt, txHash] = yield lba.createAccount();
        const postCreationState = yield getCurrentState(process.env.ECDSA_SECRET, process.env.RPC_ENDPOINT);
        const pad = 40;
        console.log(`${'Address '.padEnd(pad, '.')} ${address}`);
        console.log(`${'Gas'.padEnd(pad, '.')} ${ethers_1.ethers.utils.formatEther(initialState.balance.sub(postCreationState.balance))}`);
        console.log(`${'Tx Hash '.padEnd(pad, '.')} ${txHash}`);
        console.log(`\n`);
        // STEP 2: Sign Message 
        console.log(`STEP 2: Sign Message`);
        const salt = Buffer.from((ethers_1.ethers.BigNumber.from(ethers_1.ethers.utils.randomBytes(32)).toHexString()).slice(2), 'hex').toString('base64'); // salt improves privacy but does not guarantee it.
        const message = `My email address is contact@pauli.group [salt: ${salt}]`; // this message could be anything including an public encryption key 
        {
            // PROOF verify message reports false before signing
            const [isValid] = yield lba.verifyMessage(address, message);
            if (isValid === true)
                throw new Error('Message should not be valid yet');
        }
        const presignState = yield getCurrentState(process.env.ECDSA_SECRET, process.env.RPC_ENDPOINT);
        const [messageHash, localKeyCount, contractKeyCount, keyCountsMatch, txHash2,] = yield lba.signMessageAndPostSignature(message, address, kt);
        const postSignState = yield getCurrentState(process.env.ECDSA_SECRET, process.env.RPC_ENDPOINT);
        console.log(`${'Message '.padEnd(pad, '.')} ${messageHash}`);
        console.log(`${'Local Key Count '.padEnd(pad, '.')} ${localKeyCount}`);
        console.log(`${'Contract Key Count '.padEnd(pad, '.')} ${contractKeyCount}`);
        console.log(`${'Key Counts Match '.padEnd(pad, '.')} ${keyCountsMatch ? 'Yes' : 'No'}`);
        console.log(`${'Gas Paid'.padEnd(pad, '.')} ${ethers_1.ethers.utils.formatEther(presignState.balance.sub(postSignState.balance))}`);
        console.log(`${'Tx Hash '.padEnd(pad, '.')} ${txHash2}`);
        console.log(`\n`);
        // STEP 3: Verify Message 
        console.log(`STEP 3: Verify Message`);
        const [isValid] = yield lba.verifyMessage(address, message);
        console.log(`${'Message '.padEnd(pad, '.')} "${message}"`);
        console.log(`${'Is valid '.padEnd(pad, '.')} ${isValid ? 'Yes' : 'No'}`);
        console.log(`\n`);
        // STEP 4: Add Keys 
        console.log(`STEP 4: Add Keys`);
        const [fee, localKeyCount2, contractKeyCount2, keyCountsMatch2, txHash3,] = yield lba.addKeys(address, kt);
        console.log(`${'Fee '.padEnd(pad, '.')} ${ethers_1.ethers.utils.formatEther(fee)}`);
        console.log(`${'Local Key Count '.padEnd(pad, '.')} ${localKeyCount2}`);
        console.log(`${'Contract Key Count '.padEnd(pad, '.')} ${contractKeyCount2}`);
        console.log(`${'Key Counts Match '.padEnd(pad, '.')} ${keyCountsMatch2 ? 'Yes' : 'No'}`);
        console.log(`${'Tx Hash '.padEnd(pad, '.')} ${txHash3}`);
        console.log(`\n`);
        // STEP 5: Remove Keys
        console.log(`STEP 5: Remove Keys`);
        const allPKHs = kt.keys.map(KeyTrackerB_1.uncompressLamport).map(key => key.pkh);
        // select 5 at random
        const positions = [20, 31, 45, 52, 66,];
        const toRemove = positions.map(i => allPKHs[i]);
        const [localKeyCount3, contractKeyCount3, keyCountsMatch3, txHash4,] = yield lba.removeKeys(address, kt, toRemove);
        console.log(`${'Local Key Count '.padEnd(pad, '.')} ${localKeyCount3}`);
        console.log(`${'Contract Key Count '.padEnd(pad, '.')} ${contractKeyCount3}`);
        console.log(`${'Key Counts Match '.padEnd(pad, '.')} ${keyCountsMatch3 ? 'Yes' : 'No'}`);
        console.log(`${'Tx Hash '.padEnd(pad, '.')} ${txHash4}`);
        console.log(`\n`);
        // SUMMERY
        const finalState = yield getCurrentState(process.env.ECDSA_SECRET, process.env.RPC_ENDPOINT);
        const valueDelta = initialState.balance.sub(finalState.balance);
        console.log(`SUMMERY`);
        console.log(`${'Total operational cost'.padEnd(pad, '.')} ${ethers_1.ethers.utils.formatEther(valueDelta)}`);
    });
}
main();
