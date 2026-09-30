// Generated from out/Parity.sol/Parity.json by scripts/sync-frontend.sh
export const parityAbi = [
 {
  "type": "constructor",
  "inputs": [
   {
    "name": "marginToken_",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "priceSource_",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "rateSource_",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "params_",
    "type": "tuple",
    "internalType": "struct Parity.Params",
    "components": [
     {
      "name": "marginBps",
      "type": "uint16",
      "internalType": "uint16"
     },
     {
      "name": "callBps",
      "type": "uint16",
      "internalType": "uint16"
     },
     {
      "name": "liqBps",
      "type": "uint16",
      "internalType": "uint16"
     },
     {
      "name": "openFeeBps",
      "type": "uint16",
      "internalType": "uint16"
     },
     {
      "name": "partialLiqBps",
      "type": "uint16",
      "internalType": "uint16"
     },
     {
      "name": "liqPenaltyBps",
      "type": "uint16",
      "internalType": "uint16"
     }
    ]
   },
   {
    "name": "demoMode_",
    "type": "bool",
    "internalType": "bool"
   },
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
  "name": "BPS",
  "inputs": [],
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
  "name": "DAY_BASIS",
  "inputs": [],
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
  "name": "DECIMALS",
  "inputs": [],
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
  "name": "acceptQuote",
  "inputs": [
   {
    "name": "requestId",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "quoteId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "positionId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "applySpread",
  "inputs": [
   {
    "name": "forward",
    "type": "int256",
    "internalType": "int256"
   },
   {
    "name": "spreadBps",
    "type": "int256",
    "internalType": "int256"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "int256",
    "internalType": "int256"
   }
  ],
  "stateMutability": "pure"
 },
 {
  "type": "function",
  "name": "cancelQuote",
  "inputs": [
   {
    "name": "requestId",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "quoteId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "cancelRequest",
  "inputs": [
   {
    "name": "requestId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "computeForward",
  "inputs": [
   {
    "name": "spot",
    "type": "int256",
    "internalType": "int256"
   },
   {
    "name": "rateBase",
    "type": "int256",
    "internalType": "int256"
   },
   {
    "name": "rateQuote",
    "type": "int256",
    "internalType": "int256"
   },
   {
    "name": "tenorDays",
    "type": "uint32",
    "internalType": "uint32"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "int256",
    "internalType": "int256"
   }
  ],
  "stateMutability": "pure"
 },
 {
  "type": "function",
  "name": "currentTime",
  "inputs": [],
  "outputs": [
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
  "name": "demoMode",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "bool",
    "internalType": "bool"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "demoTime",
  "inputs": [],
  "outputs": [
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
  "name": "eligible",
  "inputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "bool",
    "internalType": "bool"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "getOpenRequestIds",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint256[]",
    "internalType": "uint256[]"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "getPosition",
  "inputs": [
   {
    "name": "id",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "tuple",
    "internalType": "struct Parity.Position",
    "components": [
     {
      "name": "id",
      "type": "uint256",
      "internalType": "uint256"
     },
     {
      "name": "hedger",
      "type": "address",
      "internalType": "address"
     },
     {
      "name": "maker",
      "type": "address",
      "internalType": "address"
     },
     {
      "name": "base",
      "type": "bytes32",
      "internalType": "bytes32"
     },
     {
      "name": "quote",
      "type": "bytes32",
      "internalType": "bytes32"
     },
     {
      "name": "direction",
      "type": "uint8",
      "internalType": "enum Parity.Direction"
     },
     {
      "name": "notional",
      "type": "int256",
      "internalType": "int256"
     },
     {
      "name": "notionalValue",
      "type": "int256",
      "internalType": "int256"
     },
     {
      "name": "lockedForward",
      "type": "int256",
      "internalType": "int256"
     },
     {
      "name": "tenorDays",
      "type": "uint32",
      "internalType": "uint32"
     },
     {
      "name": "openTime",
      "type": "uint256",
      "internalType": "uint256"
     },
     {
      "name": "maturityTime",
      "type": "uint256",
      "internalType": "uint256"
     },
     {
      "name": "initialMargin",
      "type": "int256",
      "internalType": "int256"
     },
     {
      "name": "callThreshold",
      "type": "int256",
      "internalType": "int256"
     },
     {
      "name": "liqThreshold",
      "type": "int256",
      "internalType": "int256"
     },
     {
      "name": "hedgerMargin",
      "type": "int256",
      "internalType": "int256"
     },
     {
      "name": "makerMargin",
      "type": "int256",
      "internalType": "int256"
     },
     {
      "name": "hedgerState",
      "type": "uint8",
      "internalType": "enum Parity.SideState"
     },
     {
      "name": "makerState",
      "type": "uint8",
      "internalType": "enum Parity.SideState"
     },
     {
      "name": "hedgerPartialDone",
      "type": "bool",
      "internalType": "bool"
     },
     {
      "name": "makerPartialDone",
      "type": "bool",
      "internalType": "bool"
     },
     {
      "name": "status",
      "type": "uint8",
      "internalType": "enum Parity.PositionStatus"
     },
     {
      "name": "lastMarkValue",
      "type": "int256",
      "internalType": "int256"
     },
     {
      "name": "lastMarkTime",
      "type": "uint256",
      "internalType": "uint256"
     }
    ]
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "getQuote",
  "inputs": [
   {
    "name": "requestId",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "quoteId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "tuple",
    "internalType": "struct Parity.Quote",
    "components": [
     {
      "name": "id",
      "type": "uint256",
      "internalType": "uint256"
     },
     {
      "name": "requestId",
      "type": "uint256",
      "internalType": "uint256"
     },
     {
      "name": "maker",
      "type": "address",
      "internalType": "address"
     },
     {
      "name": "spreadBps",
      "type": "int256",
      "internalType": "int256"
     },
     {
      "name": "lockedForward",
      "type": "int256",
      "internalType": "int256"
     },
     {
      "name": "expiry",
      "type": "uint256",
      "internalType": "uint256"
     },
     {
      "name": "status",
      "type": "uint8",
      "internalType": "enum Parity.QuoteStatus"
     }
    ]
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "getQuotes",
  "inputs": [
   {
    "name": "requestId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "tuple[]",
    "internalType": "struct Parity.Quote[]",
    "components": [
     {
      "name": "id",
      "type": "uint256",
      "internalType": "uint256"
     },
     {
      "name": "requestId",
      "type": "uint256",
      "internalType": "uint256"
     },
     {
      "name": "maker",
      "type": "address",
      "internalType": "address"
     },
     {
      "name": "spreadBps",
      "type": "int256",
      "internalType": "int256"
     },
     {
      "name": "lockedForward",
      "type": "int256",
      "internalType": "int256"
     },
     {
      "name": "expiry",
      "type": "uint256",
      "internalType": "uint256"
     },
     {
      "name": "status",
      "type": "uint8",
      "internalType": "enum Parity.QuoteStatus"
     }
    ]
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "getRequest",
  "inputs": [
   {
    "name": "id",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "tuple",
    "internalType": "struct Parity.Request",
    "components": [
     {
      "name": "id",
      "type": "uint256",
      "internalType": "uint256"
     },
     {
      "name": "hedger",
      "type": "address",
      "internalType": "address"
     },
     {
      "name": "base",
      "type": "bytes32",
      "internalType": "bytes32"
     },
     {
      "name": "quote",
      "type": "bytes32",
      "internalType": "bytes32"
     },
     {
      "name": "direction",
      "type": "uint8",
      "internalType": "enum Parity.Direction"
     },
     {
      "name": "notional",
      "type": "int256",
      "internalType": "int256"
     },
     {
      "name": "tenorDays",
      "type": "uint32",
      "internalType": "uint32"
     },
     {
      "name": "parityForward",
      "type": "int256",
      "internalType": "int256"
     },
     {
      "name": "initialMargin",
      "type": "int256",
      "internalType": "int256"
     },
     {
      "name": "status",
      "type": "uint8",
      "internalType": "enum Parity.RequestStatus"
     },
     {
      "name": "createdAt",
      "type": "uint256",
      "internalType": "uint256"
     }
    ]
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "insuranceBalance",
  "inputs": [],
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
  "name": "liquidate",
  "inputs": [
   {
    "name": "positionId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "marginToken",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "contract IERC20"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "marginTokenDecimals",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "uint8",
    "internalType": "uint8"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "markPosition",
  "inputs": [
   {
    "name": "positionId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "value",
    "type": "int256",
    "internalType": "int256"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "nextPositionId",
  "inputs": [],
  "outputs": [
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
  "name": "nextRequestId",
  "inputs": [],
  "outputs": [
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
  "name": "openAccess",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "bool",
    "internalType": "bool"
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
  "name": "pairId",
  "inputs": [
   {
    "name": "base",
    "type": "bytes32",
    "internalType": "bytes32"
   },
   {
    "name": "quote",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "stateMutability": "pure"
 },
 {
  "type": "function",
  "name": "pairs",
  "inputs": [
   {
    "name": "",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ],
  "outputs": [
   {
    "name": "enabled",
    "type": "bool",
    "internalType": "bool"
   },
   {
    "name": "marginInQuote",
    "type": "bool",
    "internalType": "bool"
   },
   {
    "name": "baseToken",
    "type": "address",
    "internalType": "address"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "params",
  "inputs": [],
  "outputs": [
   {
    "name": "marginBps",
    "type": "uint16",
    "internalType": "uint16"
   },
   {
    "name": "callBps",
    "type": "uint16",
    "internalType": "uint16"
   },
   {
    "name": "liqBps",
    "type": "uint16",
    "internalType": "uint16"
   },
   {
    "name": "openFeeBps",
    "type": "uint16",
    "internalType": "uint16"
   },
   {
    "name": "partialLiqBps",
    "type": "uint16",
    "internalType": "uint16"
   },
   {
    "name": "liqPenaltyBps",
    "type": "uint16",
    "internalType": "uint16"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "positionsOf",
  "inputs": [
   {
    "name": "account",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "uint256[]",
    "internalType": "uint256[]"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "postRequest",
  "inputs": [
   {
    "name": "base",
    "type": "bytes32",
    "internalType": "bytes32"
   },
   {
    "name": "quote",
    "type": "bytes32",
    "internalType": "bytes32"
   },
   {
    "name": "direction",
    "type": "uint8",
    "internalType": "enum Parity.Direction"
   },
   {
    "name": "notional",
    "type": "int256",
    "internalType": "int256"
   },
   {
    "name": "tenorDays",
    "type": "uint32",
    "internalType": "uint32"
   }
  ],
  "outputs": [
   {
    "name": "id",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "previewForward",
  "inputs": [
   {
    "name": "base",
    "type": "bytes32",
    "internalType": "bytes32"
   },
   {
    "name": "quote",
    "type": "bytes32",
    "internalType": "bytes32"
   },
   {
    "name": "tenorDays",
    "type": "uint32",
    "internalType": "uint32"
   }
  ],
  "outputs": [
   {
    "name": "forward",
    "type": "int256",
    "internalType": "int256"
   },
   {
    "name": "spot",
    "type": "int256",
    "internalType": "int256"
   },
   {
    "name": "rateBase",
    "type": "int256",
    "internalType": "int256"
   },
   {
    "name": "rateQuote",
    "type": "int256",
    "internalType": "int256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "previewMark",
  "inputs": [
   {
    "name": "positionId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "value",
    "type": "int256",
    "internalType": "int256"
   },
   {
    "name": "currentForward",
    "type": "int256",
    "internalType": "int256"
   },
   {
    "name": "spot",
    "type": "int256",
    "internalType": "int256"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "priceSource",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "contract IPriceSource"
   }
  ],
  "stateMutability": "view"
 },
 {
  "type": "function",
  "name": "rateSource",
  "inputs": [],
  "outputs": [
   {
    "name": "",
    "type": "address",
    "internalType": "contract IRateSource"
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
  "name": "seedInsurance",
  "inputs": [
   {
    "name": "tokenAmount",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "setDemoTime",
  "inputs": [
   {
    "name": "timestamp",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "setEligible",
  "inputs": [
   {
    "name": "account",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "isEligible",
    "type": "bool",
    "internalType": "bool"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "setOpenAccess",
  "inputs": [
   {
    "name": "open",
    "type": "bool",
    "internalType": "bool"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "setPair",
  "inputs": [
   {
    "name": "base",
    "type": "bytes32",
    "internalType": "bytes32"
   },
   {
    "name": "quote",
    "type": "bytes32",
    "internalType": "bytes32"
   },
   {
    "name": "marginInQuote",
    "type": "bool",
    "internalType": "bool"
   },
   {
    "name": "baseToken",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "enabled",
    "type": "bool",
    "internalType": "bool"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "setParams",
  "inputs": [
   {
    "name": "p",
    "type": "tuple",
    "internalType": "struct Parity.Params",
    "components": [
     {
      "name": "marginBps",
      "type": "uint16",
      "internalType": "uint16"
     },
     {
      "name": "callBps",
      "type": "uint16",
      "internalType": "uint16"
     },
     {
      "name": "liqBps",
      "type": "uint16",
      "internalType": "uint16"
     },
     {
      "name": "openFeeBps",
      "type": "uint16",
      "internalType": "uint16"
     },
     {
      "name": "partialLiqBps",
      "type": "uint16",
      "internalType": "uint16"
     },
     {
      "name": "liqPenaltyBps",
      "type": "uint16",
      "internalType": "uint16"
     }
    ]
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "setSources",
  "inputs": [
   {
    "name": "priceSource_",
    "type": "address",
    "internalType": "address"
   },
   {
    "name": "rateSource_",
    "type": "address",
    "internalType": "address"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "settle",
  "inputs": [
   {
    "name": "positionId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "submitQuote",
  "inputs": [
   {
    "name": "requestId",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "spreadBps",
    "type": "int256",
    "internalType": "int256"
   },
   {
    "name": "expiry",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [
   {
    "name": "quoteId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "stateMutability": "nonpayable"
 },
 {
  "type": "function",
  "name": "topUpMargin",
  "inputs": [
   {
    "name": "positionId",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "tokenAmount",
    "type": "uint256",
    "internalType": "uint256"
   }
  ],
  "outputs": [],
  "stateMutability": "nonpayable"
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
  "type": "function",
  "name": "valuePosition",
  "inputs": [
   {
    "name": "lockedForward",
    "type": "int256",
    "internalType": "int256"
   },
   {
    "name": "currentForward",
    "type": "int256",
    "internalType": "int256"
   },
   {
    "name": "notional",
    "type": "int256",
    "internalType": "int256"
   },
   {
    "name": "spot",
    "type": "int256",
    "internalType": "int256"
   },
   {
    "name": "direction",
    "type": "uint8",
    "internalType": "enum Parity.Direction"
   },
   {
    "name": "marginInQuote",
    "type": "bool",
    "internalType": "bool"
   }
  ],
  "outputs": [
   {
    "name": "",
    "type": "int256",
    "internalType": "int256"
   }
  ],
  "stateMutability": "pure"
 },
 {
  "type": "event",
  "name": "BadDebt",
  "inputs": [
   {
    "name": "positionId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "insuranceUsed",
    "type": "int256",
    "indexed": false,
    "internalType": "int256"
   },
   {
    "name": "haircut",
    "type": "int256",
    "indexed": false,
    "internalType": "int256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "Breach",
  "inputs": [
   {
    "name": "positionId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "hedgerSide",
    "type": "bool",
    "indexed": false,
    "internalType": "bool"
   },
   {
    "name": "loss",
    "type": "int256",
    "indexed": false,
    "internalType": "int256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "DemoTimeSet",
  "inputs": [
   {
    "name": "timestamp",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "EligibilitySet",
  "inputs": [
   {
    "name": "account",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "eligible",
    "type": "bool",
    "indexed": false,
    "internalType": "bool"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "InsuranceSeeded",
  "inputs": [
   {
    "name": "from",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "amount",
    "type": "int256",
    "indexed": false,
    "internalType": "int256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "Liquidated",
  "inputs": [
   {
    "name": "positionId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "hedgerSide",
    "type": "bool",
    "indexed": false,
    "internalType": "bool"
   },
   {
    "name": "isPartial",
    "type": "bool",
    "indexed": false,
    "internalType": "bool"
   },
   {
    "name": "realizedLoss",
    "type": "int256",
    "indexed": false,
    "internalType": "int256"
   },
   {
    "name": "penalty",
    "type": "int256",
    "indexed": false,
    "internalType": "int256"
   },
   {
    "name": "remainingNotional",
    "type": "int256",
    "indexed": false,
    "internalType": "int256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "MarginCall",
  "inputs": [
   {
    "name": "positionId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "hedgerSide",
    "type": "bool",
    "indexed": false,
    "internalType": "bool"
   },
   {
    "name": "loss",
    "type": "int256",
    "indexed": false,
    "internalType": "int256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "Marked",
  "inputs": [
   {
    "name": "positionId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "value",
    "type": "int256",
    "indexed": false,
    "internalType": "int256"
   },
   {
    "name": "hedgerState",
    "type": "uint8",
    "indexed": false,
    "internalType": "enum Parity.SideState"
   },
   {
    "name": "makerState",
    "type": "uint8",
    "indexed": false,
    "internalType": "enum Parity.SideState"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "OpenAccessSet",
  "inputs": [
   {
    "name": "open",
    "type": "bool",
    "indexed": false,
    "internalType": "bool"
   }
  ],
  "anonymous": false
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
  "name": "PairSet",
  "inputs": [
   {
    "name": "pairId",
    "type": "bytes32",
    "indexed": true,
    "internalType": "bytes32"
   },
   {
    "name": "base",
    "type": "bytes32",
    "indexed": false,
    "internalType": "bytes32"
   },
   {
    "name": "quote",
    "type": "bytes32",
    "indexed": false,
    "internalType": "bytes32"
   },
   {
    "name": "marginInQuote",
    "type": "bool",
    "indexed": false,
    "internalType": "bool"
   },
   {
    "name": "baseToken",
    "type": "address",
    "indexed": false,
    "internalType": "address"
   },
   {
    "name": "enabled",
    "type": "bool",
    "indexed": false,
    "internalType": "bool"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "ParamsSet",
  "inputs": [
   {
    "name": "params",
    "type": "tuple",
    "indexed": false,
    "internalType": "struct Parity.Params",
    "components": [
     {
      "name": "marginBps",
      "type": "uint16",
      "internalType": "uint16"
     },
     {
      "name": "callBps",
      "type": "uint16",
      "internalType": "uint16"
     },
     {
      "name": "liqBps",
      "type": "uint16",
      "internalType": "uint16"
     },
     {
      "name": "openFeeBps",
      "type": "uint16",
      "internalType": "uint16"
     },
     {
      "name": "partialLiqBps",
      "type": "uint16",
      "internalType": "uint16"
     },
     {
      "name": "liqPenaltyBps",
      "type": "uint16",
      "internalType": "uint16"
     }
    ]
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "PositionOpened",
  "inputs": [
   {
    "name": "positionId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "requestId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "quoteId",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   },
   {
    "name": "hedger",
    "type": "address",
    "indexed": false,
    "internalType": "address"
   },
   {
    "name": "maker",
    "type": "address",
    "indexed": false,
    "internalType": "address"
   },
   {
    "name": "lockedForward",
    "type": "int256",
    "indexed": false,
    "internalType": "int256"
   },
   {
    "name": "maturityTime",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "QuoteCancelled",
  "inputs": [
   {
    "name": "requestId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "quoteId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "QuoteSubmitted",
  "inputs": [
   {
    "name": "requestId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "quoteId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "maker",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "spreadBps",
    "type": "int256",
    "indexed": false,
    "internalType": "int256"
   },
   {
    "name": "lockedForward",
    "type": "int256",
    "indexed": false,
    "internalType": "int256"
   },
   {
    "name": "expiry",
    "type": "uint256",
    "indexed": false,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "RequestCancelled",
  "inputs": [
   {
    "name": "requestId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "RequestPosted",
  "inputs": [
   {
    "name": "requestId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "hedger",
    "type": "address",
    "indexed": true,
    "internalType": "address"
   },
   {
    "name": "base",
    "type": "bytes32",
    "indexed": false,
    "internalType": "bytes32"
   },
   {
    "name": "quote",
    "type": "bytes32",
    "indexed": false,
    "internalType": "bytes32"
   },
   {
    "name": "direction",
    "type": "uint8",
    "indexed": false,
    "internalType": "enum Parity.Direction"
   },
   {
    "name": "notional",
    "type": "int256",
    "indexed": false,
    "internalType": "int256"
   },
   {
    "name": "tenorDays",
    "type": "uint32",
    "indexed": false,
    "internalType": "uint32"
   },
   {
    "name": "parityForward",
    "type": "int256",
    "indexed": false,
    "internalType": "int256"
   },
   {
    "name": "initialMargin",
    "type": "int256",
    "indexed": false,
    "internalType": "int256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "Settled",
  "inputs": [
   {
    "name": "positionId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "value",
    "type": "int256",
    "indexed": false,
    "internalType": "int256"
   },
   {
    "name": "hedgerPayout",
    "type": "int256",
    "indexed": false,
    "internalType": "int256"
   },
   {
    "name": "makerPayout",
    "type": "int256",
    "indexed": false,
    "internalType": "int256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "SourcesSet",
  "inputs": [
   {
    "name": "priceSource",
    "type": "address",
    "indexed": false,
    "internalType": "address"
   },
   {
    "name": "rateSource",
    "type": "address",
    "indexed": false,
    "internalType": "address"
   }
  ],
  "anonymous": false
 },
 {
  "type": "event",
  "name": "TopUp",
  "inputs": [
   {
    "name": "positionId",
    "type": "uint256",
    "indexed": true,
    "internalType": "uint256"
   },
   {
    "name": "hedgerSide",
    "type": "bool",
    "indexed": false,
    "internalType": "bool"
   },
   {
    "name": "amount",
    "type": "int256",
    "indexed": false,
    "internalType": "int256"
   }
  ],
  "anonymous": false
 },
 {
  "type": "error",
  "name": "InvalidInput",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NotDemoMode",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NotEligible",
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
  "name": "NotLiquidatable",
  "inputs": [
   {
    "name": "positionId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ]
 },
 {
  "type": "error",
  "name": "NotMature",
  "inputs": [
   {
    "name": "positionId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ]
 },
 {
  "type": "error",
  "name": "NotPositionParty",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NotQuoteMaker",
  "inputs": []
 },
 {
  "type": "error",
  "name": "NotRequestHedger",
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
  "name": "PairDisabled",
  "inputs": [
   {
    "name": "pairId",
    "type": "bytes32",
    "internalType": "bytes32"
   }
  ]
 },
 {
  "type": "error",
  "name": "PositionNotActive",
  "inputs": [
   {
    "name": "positionId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ]
 },
 {
  "type": "error",
  "name": "QuoteExpired",
  "inputs": [
   {
    "name": "requestId",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "quoteId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ]
 },
 {
  "type": "error",
  "name": "QuoteNotLive",
  "inputs": [
   {
    "name": "requestId",
    "type": "uint256",
    "internalType": "uint256"
   },
   {
    "name": "quoteId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ]
 },
 {
  "type": "error",
  "name": "ReentrancyGuardReentrantCall",
  "inputs": []
 },
 {
  "type": "error",
  "name": "RequestNotOpen",
  "inputs": [
   {
    "name": "requestId",
    "type": "uint256",
    "internalType": "uint256"
   }
  ]
 },
 {
  "type": "error",
  "name": "SafeERC20FailedOperation",
  "inputs": [
   {
    "name": "token",
    "type": "address",
    "internalType": "address"
   }
  ]
 }
] as const;
