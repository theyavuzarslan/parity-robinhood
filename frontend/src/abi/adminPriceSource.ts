// Generated from out/AdminPriceSource.sol/AdminPriceSource.json by scripts/sync-frontend.sh
export const adminPriceSourceAbi = [
 {
  "type": "constructor",
  "inputs": [
   {
    "name": "owner_",
    "type": "address",
    "internalType": "address"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "history",
  "inputs": [
   {
    "name": "pairId",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "outputs": [
   {
    "name": "prints",
    "type": "int256[3]",
    "internalType": "int256[3]"
   },
   {
    "name": "len",
    "type": "uint8",
    "internalType": "uint8"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "liquidationSpot",
  "inputs": [
   {
    "name": "pairId",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "int256",
    "internalType": "int256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "owner",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "address"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "renounceOwnership",
  "inputs": [],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "setSpot",
  "inputs": [
   {
    "name": "pairId",
    "type": "bytes32",
    "internalType": "bytes32"
   },
   {
    "name": "price7",
    "type": "int256",
    "internalType": "int256"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "spot",
  "inputs": [
   {
    "name": "pairId",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "int256",
    "internalType": "int256"
   },
   {
    "name": "",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "transferOwnership",
  "inputs": [
   {
    "name": "newOwner",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "event",
  "name": "OwnershipTransferred",
  "inputs": [
   {
    "name": "previousOwner",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "newOwner",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "SpotSet",
  "inputs": [
   {
    "name": "pairId",
    "type": "bytes32",
    "indexed": true,
    "internalType": "bytes32"
   },
   {
    "name": "price7",
    "type": "int256",
    "indexed": false,
    "internalType": "int256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "error",
  "name": "InvalidPrice",
  "inputs": []
 },
 {
  "type": "error",
  "name": "OwnableInvalidOwner",
  "inputs": [
   {
    "name": "owner",
    "type": "address",
    "internalType": "address"
   }
  ]
 },
 {
  "type": "error",
  "name": "OwnableUnauthorizedAccount",
  "inputs": [
   {
    "name": "account",
    "type": "address",
    "internalType": "address"
   }
  ]
 },
 {
  "type": "error",
  "name": "PriceNotSet",
  "inputs": [
   {
    "name": "pairId",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ]
 }
] as const;
