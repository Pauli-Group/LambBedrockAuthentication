import { ethers } from "ethers";
import { BaseKeyTracker, checkSignature, convertSignatureForSolidity, getSelector, hashBWithMonad, signHashWithMonadAndCurry } from "./Common";
import KeyTrackerB, { uncompressLamport } from "./KeyTrackerB";
import FactoryJson from "./contracts/LambBedrockAuthenticationFactory.json";
import AccountJson from "./contracts/LambBedrockAuthentication.json";
import Monad from "./Monad";

export interface ILambBedrockAutentication {
    createAccount(initialKeyCount: number): Promise<[string, BaseKeyTracker, string]>;
    verifyMessage(a: string, b: string): Promise<[boolean]>;
    signMessageAndPostSignature(a: string, b: string, c: BaseKeyTracker): Promise<any>;
    addKeys(a: string, b: BaseKeyTracker, amountToAdd: number): Promise<[ethers.BigNumber, number, number, boolean, string]>;
    removeKeys(a: string, b: KeyTrackerB, c: string[]): Promise<[number, number, boolean, string]>;
}

export default class LambBedrockAuthentication implements ILambBedrockAutentication {
    ecdsaSecret: string = "";
    rpcEndpoint: string = "";
    factoryAddress: string = "";
    confirmationTarget: number = 0;

    constructor(_ecdsaSecret: string, _rpcEndpoint: string, _factoryAddress: string, _confirmationTarget: number) {
        this.ecdsaSecret = _ecdsaSecret;
        this.rpcEndpoint = _rpcEndpoint;
        this.factoryAddress = _factoryAddress;
        this.confirmationTarget = _confirmationTarget;
    }

    async createAccount(initialKeyCount: number = 200): Promise<[string, BaseKeyTracker, string]> {
        const keyTracker = new KeyTrackerB();
        const initialKeys = keyTracker.more(initialKeyCount);
        const initialKeyHashes = initialKeys.map(key => key.pkh);

        const provider = new ethers.providers.JsonRpcProvider(this.rpcEndpoint);
        const caller: ethers.Wallet = (new ethers.Wallet(this.ecdsaSecret)).connect(provider);

        const callersToApprove = [   // Accounts which should be allowed to submit transactions to the contract. Any caller would also need a valid lamport key to actually create a transaction. 
            caller.address,
            "0x4f171744973047296d90e7828676F4972faFB200", // pauligroup.eth
        ]

        const factory = new ethers.Contract(this.factoryAddress, FactoryJson.abi, caller);
        const counterfactual = await factory.getAddress(initialKeyHashes, callersToApprove);

        const tx = await factory.createAccount(
            initialKeyHashes,
            callersToApprove,
        );

        const receipt = await tx.wait(this.confirmationTarget);

        {
            // SANITY CHECK: get the deployed address from the event logs - future iterations will use CREATE2 and the address will be computed counterfactually 
            const creationEvent = receipt.logs.find((log: any) => log.topics[0] === factory.interface.getEventTopic('AccountCreated'))
            const deployedAddress = `0x${creationEvent.topics[1].slice(26)}`
            if (deployedAddress.toLowerCase() !== counterfactual.toLowerCase())
                throw new Error(`Counterfactual address ${counterfactual} does not match deployed address ${deployedAddress}`)
        }

        return [counterfactual, keyTracker, tx.hash];
    }

    async verifyMessage(senderAuthAddress: string, message: string): Promise<[boolean]> {
        const provider = new ethers.providers.JsonRpcProvider(this.rpcEndpoint);

        const accountContract = new ethers.Contract(senderAuthAddress, AccountJson.abi, provider);
        const messageHash = ethers.utils.keccak256(ethers.utils.solidityPack(['string'], [message]))

        const result = await accountContract.isValidSignature(messageHash, '0x')
        const isValid = result === '0x1626ba7e'

        return [
            isValid,
        ]
    }

    // NOTICE: it matters a lot here that objects in typescript are passed by reference. If you sign a message with 
    //         the keytracker, the keytracker needs to modify its internal state to reflect that the key has been 
    //         used. If 2 messages are signed with the same key by mistake somehow, ~75% of the secret will have 
    //         been leaked. If neither of these messages are finalized on the blockchain this is especially bad, as 
    //         a kean observer could use the leaked secret to sign a carfully crafted fraudulent message.
    async signMessageAndPostSignature(_message: string, accountAddress: string, keys: BaseKeyTracker): Promise<any> {
        const provider = new ethers.providers.JsonRpcProvider(this.rpcEndpoint);
        const caller: ethers.Wallet = (new ethers.Wallet(this.ecdsaSecret)).connect(provider);
        const accountContract = new ethers.Contract(accountAddress, AccountJson.abi, caller);

        const signingKeys = keys.getOne()

        const message = ethers.utils.keccak256(ethers.utils.solidityPack(['string'], [_message]))
        const selector = getSelector(accountContract, 'endorseMessage')
        const hashToSign = Monad.of(ethers.utils.keccak256(ethers.utils.solidityPack(['bytes32', 'bytes4'], [message, selector])))
        const signature = hashToSign
            .bind(signHashWithMonadAndCurry(signingKeys.pri))
            .bind(checkSignature(signingKeys.pub)(hashToSign.unwrap()))
            .bind(convertSignatureForSolidity)

        const tx = await accountContract.endorseMessage(message, signingKeys.pub, signature.unwrap())
        const receipt = await tx.wait(this.confirmationTarget)

        const remainingLocal = keys.count
        const remainingOnContract = (await accountContract.liveKeyCount()).toNumber() // should be a number JavaScript can handle

        return [
            message,
            remainingLocal,
            remainingOnContract,
            remainingLocal === remainingOnContract,
            tx.hash
        ]
    }

    // NOTICE: again, it matters a lot here that objects in typescript are passed by reference
    async addKeys(accountAddress: string, keys: BaseKeyTracker, amountToAdd: number = 200): Promise<[ethers.BigNumber, number, number, boolean, string]> {
        const provider = new ethers.providers.JsonRpcProvider(this.rpcEndpoint);
        const caller: ethers.Wallet = (new ethers.Wallet(this.ecdsaSecret)).connect(provider);
        const accountContract = new ethers.Contract(accountAddress, AccountJson.abi, caller);

        const signingKeys = keys.getOne()

        const keysToAdd = keys.more(amountToAdd)
        const publicKeyHashes = keysToAdd.map(key => BaseKeyTracker.pkhFromPublicKey(key.pub))

        const fee = await accountContract.getKeyAdditionFee()

        // ensure we can pay the fee
        const balance = await caller.getBalance()
        if (balance.lt(fee))
            throw new Error(`Insufficient balance to pay fee. Balance: ${ethers.utils.formatEther(balance)}, Fee: ${ethers.utils.formatEther(fee)}`)

        const selector = getSelector(accountContract, 'addPublicKeyHashes')

        const prep = (publicKeyHashes: string[]) => new Monad(ethers.utils.solidityPack(['bytes32[]', 'bytes4'], [publicKeyHashes, selector]))

        const hashToSign = new Monad(publicKeyHashes)
            .bind(prep)
            .bind(hashBWithMonad)

        const signature = hashToSign
            .bind(signHashWithMonadAndCurry(signingKeys.pri))
            .bind(checkSignature(signingKeys.pub)(hashToSign.unwrap()))
            .bind(convertSignatureForSolidity)

        const tx = await accountContract.addPublicKeyHashes(publicKeyHashes, signingKeys.pub, signature.unwrap(), { value: fee })

        const receipt = await tx.wait(this.confirmationTarget)

        const remainingLocal = keys.count
        const remainingOnContract = (await accountContract.liveKeyCount()).toNumber()

        return [
            fee as ethers.BigNumber,
            remainingLocal,
            remainingOnContract,
            remainingLocal === remainingOnContract,
            tx.hash
        ]
    }

    // NOTICE: again, it matters a lot here that objects in typescript are passed by reference
    async removeKeys(accountAddress: string, keys: KeyTrackerB, toRemove: string[]): Promise<[number, number, boolean, string]> {
        const signingKeys = keys.getOne()
        const signingPKH = BaseKeyTracker.pkhFromPublicKey(signingKeys.pub)

        if (toRemove.includes(signingPKH))
            throw new Error(`Cannot remove signing key`)

        {
            // find the keys we want to remove from the local key tracker and remove them
            const allPKHs = keys.keys.map(uncompressLamport).map(key => key.pkh);
            const targetIndices = allPKHs.flatMap((pkh, i) => toRemove.includes(pkh) ? [i] : [])

            keys.keys = keys.keys.filter((_, i) => !targetIndices.includes(i))
        }

        const provider = new ethers.providers.JsonRpcProvider(this.rpcEndpoint);
        const caller: ethers.Wallet = (new ethers.Wallet(this.ecdsaSecret)).connect(provider);
        const accountContract = new ethers.Contract(accountAddress, AccountJson.abi, caller);

        const selector = getSelector(accountContract, 'removePublicKeyHashes')
        const prep = (publicKeyHashes: string[]) => new Monad(ethers.utils.solidityPack(['bytes32[]', 'bytes4'], [publicKeyHashes, selector]))
        const hashToSign = prep(toRemove)
            .bind(hashBWithMonad)

        const signature = hashToSign
            .bind(signHashWithMonadAndCurry(signingKeys.pri))
            .bind(checkSignature(signingKeys.pub)(hashToSign.unwrap()))
            .bind(convertSignatureForSolidity)

        const tx = await accountContract.removePublicKeyHashes(toRemove, signingKeys.pub, signature.unwrap())
        const receipt = await tx.wait(this.confirmationTarget)

        const remainingLocal = keys.count
        const remainingOnContract = (await accountContract.liveKeyCount()).toNumber()

        return [
            remainingLocal,
            remainingOnContract,
            remainingLocal === remainingOnContract,
            tx.hash
        ]
    }
}