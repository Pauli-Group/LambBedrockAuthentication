

## Learn About LAMB

https://anchorwallet.ca/whitepaper/

## Connect with Pauli Group

https://discord.com/invite/JAEC8pgWFV

https://twitter.com/pauli_group


## Getting started

> npm i

> create a .env file with the following variables, and set them accordingly

```
ECDSA_SECRET=''
RPC_ENDPOINT=''
WALLET_FACTORY=''
```

To build the JavaScript files from the Typescript files
> npx tsc 

 To Run A Demonstration

> node src/Main.js

After making changes to any of the Typescript files you will need to recompile them to JavaScript files. 

## Factories

| Chain  | Factory Address                            | Account Implementation                     | KeyFeeBeacon                               |
|--------|--------------------------------------------|--------------------------------------------|--------------------------------------------|
| Mumbai (testnet) | 0x99280358eA9f0cA197C713a048147F407a5da553 | 0xfC0b49E2f62203b1Ca017EafA9D430488876A8c7 | 0xf548DB31661323558d31C819ffB3322e6449132B |
| Milkomeda | 0xfffFdA9A3a4f1FE8EAb0376A7e6360b1023A2383 | 0x8618697E219834b3AD45f7367534Ba119e99CcCd | 0x07f3ca7949E0Ba92Ee3D28Be57362baEa08d4E00 |
| Polygon   | 0xfffFdA9A3a4f1FE8EAb0376A7e6360b1023A2383 | 0x8618697E219834b3AD45f7367534Ba119e99CcCd | 0x07f3ca7949E0Ba92Ee3D28Be57362baEa08d4E00 |
| Gnosis | 0xfffFdA9A3a4f1FE8EAb0376A7e6360b1023A2383 | 0x8618697E219834b3AD45f7367534Ba119e99CcCd | 0x07f3ca7949E0Ba92Ee3D28Be57362baEa08d4E00 |


## Fees

Account creation is free aside from transaction fees. Pauli Group takes a fee upon posting new Lamport Keys to your contract. This fee is independent of the number of keys being posted and there is no explicit limitation on the number of keys which can be posted at once. There is no fee incured for posting the initial keys at the time of account creation.  

The fee you should pay can be found by calling the `getKeyAdditionFee` function on your account. This fee is not constent and can be paid at the descretion of Pauli Group, so you should re-call this function each time before posting new keys.

This fee exists so Pauli Group can continue to bring you wonderful things. 

## Account Health

- Don't run out of keys. You can always find your current key count by calling `liveKeyCount` on your account. 
- Don't let your key count get to low. If you had only 1 key left and you planned to use it to post more keys you would have to be extremely careful. If your tansaction failed or was never picked up you would have to consider that key unsafe to use. You may be able to resubmit the same transaction in some, but not all, cases. If you could not safely resubmit the transaction you would have to consider the account unsafe to use.
- If a transaction fails mark that key as unsafe locally and delete the private key. You should remove these unsafe keys from your contract but you may want to wait for a few of them to accumulate before doing so, to minimize the number of transactions you have to pay for.

## Verifying Online

https://app.anchorwallet.ca/verify

## Using Your Own Node

If you really want to benefit from the security that comes with using a distributed ledger as an authentication channel you should run your own node. This way you verify every signature yourself instead of relying a on a third party to accurately report the state of the chain.   

> Setup a milkomeda node https://github.com/dcSpark/milkomeda-c1-evm-passive

> Setup a polygon nodeo https://wiki.polygon.technology/docs/category/run-a-full-node 

> Setup a gnosis node https://docs.gnosischain.com/node
