import KeyTrackerB, { uncompressLamport } from "./KeyTrackerB";
import { ethers } from "ethers";
import "dotenv/config"
import LambBedrockAuthentication from "./LambBedrockAuthentication";

const getCurrentState = async (secret: string, rpcEndpoint: string): Promise<any> => {
    const provider = new ethers.providers.JsonRpcProvider(rpcEndpoint);
    const caller: ethers.Wallet = (new ethers.Wallet(secret)).connect(provider);

    return {
        balance: await caller.getBalance(),
    }
}

async function main() {

    const initialState = await getCurrentState(process.env.ECDSA_SECRET!, process.env.RPC_ENDPOINT!);

    const lba = new LambBedrockAuthentication(
        process.env.ECDSA_SECRET!,
        process.env.RPC_ENDPOINT!,
        process.env.WALLET_FACTORY!,
        1,
    );

    // STEP 1: Create Account
    console.log(`STEP 1: Create Account`)

    const [address, kt, txHash] = await lba.createAccount();
    const postCreationState = await getCurrentState(process.env.ECDSA_SECRET!, process.env.RPC_ENDPOINT!);

    const pad = 40;
    console.log(`${'Address '.padEnd(pad, '.')} ${address}`);
    console.log(`${'Gas'.padEnd(pad, '.')} ${ethers.utils.formatEther(initialState.balance.sub(postCreationState.balance))}`)
    console.log(`${'Tx Hash '.padEnd(pad, '.')} ${txHash}`);
    console.log(`\n`);

    // STEP 2: Sign Message 
    console.log(`STEP 2: Sign Message`)

    const salt = Buffer.from((ethers.BigNumber.from(ethers.utils.randomBytes(32)).toHexString()).slice(2), 'hex').toString('base64'); // salt improves privacy but does not guarantee it.
    const message = `My email address is contact@pauli.group [salt: ${salt}]`; // this message could be anything including an public encryption key 

    {
        // PROOF verify message reports false before signing
        const [isValid] = await lba.verifyMessage(address, message);
        if (isValid === true)
            throw new Error('Message should not be valid yet');
    }

    const presignState = await getCurrentState(process.env.ECDSA_SECRET!, process.env.RPC_ENDPOINT!);

    const [
        messageHash,
        localKeyCount,
        contractKeyCount,
        keyCountsMatch,
        txHash2,
    ] = await lba.signMessageAndPostSignature(message, address, kt);

    const postSignState = await getCurrentState(process.env.ECDSA_SECRET!, process.env.RPC_ENDPOINT!);

    console.log(`${'Message '.padEnd(pad, '.')} ${messageHash}`);
    console.log(`${'Local Key Count '.padEnd(pad, '.')} ${localKeyCount}`);
    console.log(`${'Contract Key Count '.padEnd(pad, '.')} ${contractKeyCount}`);
    console.log(`${'Key Counts Match '.padEnd(pad, '.')} ${keyCountsMatch ? 'Yes' : 'No'}`);
    console.log(`${'Gas Paid'.padEnd(pad, '.')} ${ethers.utils.formatEther(presignState.balance.sub(postSignState.balance))}`)
    console.log(`${'Tx Hash '.padEnd(pad, '.')} ${txHash2}`);
    console.log(`\n`);

    // STEP 3: Verify Message 
    console.log(`STEP 3: Verify Message`)

    const [isValid] = await lba.verifyMessage(address, message);

    console.log(`${'Message '.padEnd(pad, '.')} "${message}"`);
    console.log(`${'Is valid '.padEnd(pad, '.')} ${isValid ? 'Yes' : 'No'}`);
    console.log(`\n`);

    // STEP 4: Add Keys 
    console.log(`STEP 4: Add Keys`)

    const [
        fee,
        localKeyCount2,
        contractKeyCount2,
        keyCountsMatch2,
        txHash3,
    ] = await lba.addKeys(address, kt);

    console.log(`${'Fee '.padEnd(pad, '.')} ${ethers.utils.formatEther(fee)}`);
    console.log(`${'Local Key Count '.padEnd(pad, '.')} ${localKeyCount2}`);
    console.log(`${'Contract Key Count '.padEnd(pad, '.')} ${contractKeyCount2}`);
    console.log(`${'Key Counts Match '.padEnd(pad, '.')} ${keyCountsMatch2 ? 'Yes' : 'No'}`);
    console.log(`${'Tx Hash '.padEnd(pad, '.')} ${txHash3}`);
    console.log(`\n`);

    // STEP 5: Remove Keys
    console.log(`STEP 5: Remove Keys`)

    const allPKHs = (kt as KeyTrackerB).keys.map(uncompressLamport).map(key => key.pkh);

    // select 5 at random
    const positions = [20, 31, 45, 52, 66,]
    const toRemove = positions.map(i => allPKHs[i])

    const [
        localKeyCount3,
        contractKeyCount3,
        keyCountsMatch3,
        txHash4,
    ] = await lba.removeKeys(address, kt as KeyTrackerB, toRemove);

    console.log(`${'Local Key Count '.padEnd(pad, '.')} ${localKeyCount3}`);
    console.log(`${'Contract Key Count '.padEnd(pad, '.')} ${contractKeyCount3}`);
    console.log(`${'Key Counts Match '.padEnd(pad, '.')} ${keyCountsMatch3 ? 'Yes' : 'No'}`);
    console.log(`${'Tx Hash '.padEnd(pad, '.')} ${txHash4}`);
    console.log(`\n`);

    // SUMMERY
    const finalState = await getCurrentState(process.env.ECDSA_SECRET!, process.env.RPC_ENDPOINT!);
    const valueDelta = initialState.balance.sub(finalState.balance);

    console.log(`SUMMERY`);
    console.log(`${ 'Total operational cost'.padEnd(pad, '.')} ${ethers.utils.formatEther(valueDelta)}`);
}

main();
