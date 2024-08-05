export const CrowdfundedTasksManagerContract = {
  abi: [
    { type: "receive", stateMutability: "payable" },
    {
      type: "function",
      name: "CLOCK_MODE",
      inputs: [],
      outputs: [{ name: "", type: "string", internalType: "string" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "allowance",
      inputs: [
        { name: "owner", type: "address", internalType: "address" },
        { name: "spender", type: "address", internalType: "address" },
      ],
      outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "allowedTokens",
      inputs: [
        { name: "token", type: "address", internalType: "contract IERC20" },
      ],
      outputs: [
        {
          name: "",
          type: "tuple",
          internalType: "struct CrowdfundedTasksManager.TokenInfo",
          components: [
            { name: "rate", type: "uint96", internalType: "uint96" },
            { name: "index", type: "uint8", internalType: "uint8" },
          ],
        },
      ],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "approve",
      inputs: [
        { name: "spender", type: "address", internalType: "address" },
        { name: "value", type: "uint256", internalType: "uint256" },
      ],
      outputs: [{ name: "", type: "bool", internalType: "bool" }],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "balanceOf",
      inputs: [{ name: "account", type: "address", internalType: "address" }],
      outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "checkpoints",
      inputs: [
        { name: "account", type: "address", internalType: "address" },
        { name: "pos", type: "uint32", internalType: "uint32" },
      ],
      outputs: [
        {
          name: "",
          type: "tuple",
          internalType: "struct Checkpoints.Checkpoint208",
          components: [
            { name: "_key", type: "uint48", internalType: "uint48" },
            { name: "_value", type: "uint208", internalType: "uint208" },
          ],
        },
      ],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "clock",
      inputs: [],
      outputs: [{ name: "", type: "uint48", internalType: "uint48" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "contribute",
      inputs: [
        { name: "token", type: "address", internalType: "contract IERC20" },
        { name: "amount", type: "uint96", internalType: "uint96" },
      ],
      outputs: [],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "contributeNative",
      inputs: [],
      outputs: [],
      stateMutability: "payable",
    },
    {
      type: "function",
      name: "createProposal",
      inputs: [
        { name: "metadata", type: "string", internalType: "string" },
        { name: "action", type: "bytes", internalType: "bytes" },
      ],
      outputs: [
        { name: "proposalId", type: "uint256", internalType: "uint256" },
      ],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "decimals",
      inputs: [],
      outputs: [{ name: "", type: "uint8", internalType: "uint8" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "delegate",
      inputs: [{ name: "delegatee", type: "address", internalType: "address" }],
      outputs: [],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "delegateBySig",
      inputs: [
        { name: "delegatee", type: "address", internalType: "address" },
        { name: "nonce", type: "uint256", internalType: "uint256" },
        { name: "expiry", type: "uint256", internalType: "uint256" },
        { name: "v", type: "uint8", internalType: "uint8" },
        { name: "r", type: "bytes32", internalType: "bytes32" },
        { name: "s", type: "bytes32", internalType: "bytes32" },
      ],
      outputs: [],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "delegates",
      inputs: [{ name: "account", type: "address", internalType: "address" }],
      outputs: [{ name: "", type: "address", internalType: "address" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "eip712Domain",
      inputs: [],
      outputs: [
        { name: "fields", type: "bytes1", internalType: "bytes1" },
        { name: "name", type: "string", internalType: "string" },
        { name: "version", type: "string", internalType: "string" },
        { name: "chainId", type: "uint256", internalType: "uint256" },
        { name: "verifyingContract", type: "address", internalType: "address" },
        { name: "salt", type: "bytes32", internalType: "bytes32" },
        { name: "extensions", type: "uint256[]", internalType: "uint256[]" },
      ],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "executeProposal",
      inputs: [
        { name: "proposalId", type: "uint256", internalType: "uint256" },
      ],
      outputs: [],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "executionDelay",
      inputs: [],
      outputs: [{ name: "", type: "uint48", internalType: "uint48" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "getPastTotalSupply",
      inputs: [{ name: "timepoint", type: "uint256", internalType: "uint256" }],
      outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "getPastVotes",
      inputs: [
        { name: "account", type: "address", internalType: "address" },
        { name: "timepoint", type: "uint256", internalType: "uint256" },
      ],
      outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "getVotes",
      inputs: [{ name: "account", type: "address", internalType: "address" }],
      outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "name",
      inputs: [],
      outputs: [{ name: "", type: "string", internalType: "string" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "nativeRate",
      inputs: [],
      outputs: [{ name: "", type: "uint208", internalType: "uint208" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "nonces",
      inputs: [{ name: "owner", type: "address", internalType: "address" }],
      outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "numCheckpoints",
      inputs: [{ name: "account", type: "address", internalType: "address" }],
      outputs: [{ name: "", type: "uint32", internalType: "uint32" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "proposalCount",
      inputs: [],
      outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "proposalInfo",
      inputs: [
        { name: "proposalId", type: "uint256", internalType: "uint256" },
      ],
      outputs: [
        {
          name: "",
          type: "tuple",
          internalType: "struct CrowdfundedTasksManager.ProposalInfo",
          components: [
            { name: "executed", type: "bool", internalType: "bool" },
            { name: "snapshot", type: "uint48", internalType: "uint48" },
            { name: "approvals", type: "uint256", internalType: "uint256" },
            { name: "rejections", type: "uint256", internalType: "uint256" },
            { name: "action", type: "bytes", internalType: "bytes" },
          ],
        },
      ],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "proposalVotes",
      inputs: [
        { name: "proposalId", type: "uint256", internalType: "uint256" },
        { name: "voter", type: "address", internalType: "address" },
      ],
      outputs: [
        {
          name: "",
          type: "uint8",
          internalType: "enum CrowdfundedTasksManager.Vote",
        },
      ],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "symbol",
      inputs: [],
      outputs: [{ name: "", type: "string", internalType: "string" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "taskId",
      inputs: [],
      outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "tasks",
      inputs: [],
      outputs: [{ name: "", type: "address", internalType: "contract ITasks" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "totalSupply",
      inputs: [],
      outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "transfer",
      inputs: [
        { name: "to", type: "address", internalType: "address" },
        { name: "value", type: "uint256", internalType: "uint256" },
      ],
      outputs: [{ name: "", type: "bool", internalType: "bool" }],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "transferFrom",
      inputs: [
        { name: "from", type: "address", internalType: "address" },
        { name: "to", type: "address", internalType: "address" },
        { name: "value", type: "uint256", internalType: "uint256" },
      ],
      outputs: [{ name: "", type: "bool", internalType: "bool" }],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "voteProposal",
      inputs: [
        { name: "proposalId", type: "uint256", internalType: "uint256" },
        {
          name: "vote",
          type: "uint8",
          internalType: "enum CrowdfundedTasksManager.Vote",
        },
      ],
      outputs: [],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "withdraw",
      inputs: [
        {
          name: "tokens",
          type: "address[]",
          internalType: "contract IERC20[]",
        },
      ],
      outputs: [],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "withdrawable",
      inputs: [
        {
          name: "tokens",
          type: "address[]",
          internalType: "contract IERC20[]",
        },
      ],
      outputs: [
        { name: "amounts", type: "uint256[]", internalType: "uint256[]" },
      ],
      stateMutability: "view",
    },
    {
      type: "event",
      name: "Approval",
      inputs: [
        {
          name: "owner",
          type: "address",
          indexed: true,
          internalType: "address",
        },
        {
          name: "spender",
          type: "address",
          indexed: true,
          internalType: "address",
        },
        {
          name: "value",
          type: "uint256",
          indexed: false,
          internalType: "uint256",
        },
      ],
      anonymous: false,
    },
    {
      type: "event",
      name: "DelegateChanged",
      inputs: [
        {
          name: "delegator",
          type: "address",
          indexed: true,
          internalType: "address",
        },
        {
          name: "fromDelegate",
          type: "address",
          indexed: true,
          internalType: "address",
        },
        {
          name: "toDelegate",
          type: "address",
          indexed: true,
          internalType: "address",
        },
      ],
      anonymous: false,
    },
    {
      type: "event",
      name: "DelegateVotesChanged",
      inputs: [
        {
          name: "delegate",
          type: "address",
          indexed: true,
          internalType: "address",
        },
        {
          name: "previousVotes",
          type: "uint256",
          indexed: false,
          internalType: "uint256",
        },
        {
          name: "newVotes",
          type: "uint256",
          indexed: false,
          internalType: "uint256",
        },
      ],
      anonymous: false,
    },
    {
      type: "event",
      name: "EIP712DomainChanged",
      inputs: [],
      anonymous: false,
    },
    {
      type: "event",
      name: "Initialized",
      inputs: [
        {
          name: "version",
          type: "uint64",
          indexed: false,
          internalType: "uint64",
        },
      ],
      anonymous: false,
    },
    {
      type: "event",
      name: "ProposalCreated",
      inputs: [
        {
          name: "proposalId",
          type: "uint256",
          indexed: true,
          internalType: "uint256",
        },
        {
          name: "metadata",
          type: "string",
          indexed: false,
          internalType: "string",
        },
        {
          name: "action",
          type: "bytes",
          indexed: false,
          internalType: "bytes",
        },
      ],
      anonymous: false,
    },
    {
      type: "event",
      name: "ProposalExecuted",
      inputs: [
        {
          name: "proposalId",
          type: "uint256",
          indexed: true,
          internalType: "uint256",
        },
        {
          name: "action",
          type: "bytes",
          indexed: false,
          internalType: "bytes",
        },
        {
          name: "returnData",
          type: "bytes",
          indexed: false,
          internalType: "bytes",
        },
      ],
      anonymous: false,
    },
    {
      type: "event",
      name: "ProposalVoted",
      inputs: [
        {
          name: "proposalId",
          type: "uint256",
          indexed: true,
          internalType: "uint256",
        },
        {
          name: "voter",
          type: "address",
          indexed: true,
          internalType: "address",
        },
        {
          name: "vote",
          type: "uint8",
          indexed: false,
          internalType: "enum CrowdfundedTasksManager.Vote",
        },
      ],
      anonymous: false,
    },
    {
      type: "event",
      name: "Transfer",
      inputs: [
        {
          name: "from",
          type: "address",
          indexed: true,
          internalType: "address",
        },
        { name: "to", type: "address", indexed: true, internalType: "address" },
        {
          name: "value",
          type: "uint256",
          indexed: false,
          internalType: "uint256",
        },
      ],
      anonymous: false,
    },
    {
      type: "error",
      name: "AddressEmptyCode",
      inputs: [{ name: "target", type: "address", internalType: "address" }],
    },
    {
      type: "error",
      name: "AddressInsufficientBalance",
      inputs: [{ name: "account", type: "address", internalType: "address" }],
    },
    {
      type: "error",
      name: "AlreadyVoted",
      inputs: [
        { name: "proposalId", type: "uint256", internalType: "uint256" },
        { name: "account", type: "address", internalType: "address" },
      ],
    },
    {
      type: "error",
      name: "BeforeExecutionDelay",
      inputs: [
        { name: "currentClock", type: "uint48", internalType: "uint48" },
        { name: "executableFrom", type: "uint48", internalType: "uint48" },
      ],
    },
    { type: "error", name: "CheckpointUnorderedInsertion", inputs: [] },
    { type: "error", name: "ECDSAInvalidSignature", inputs: [] },
    {
      type: "error",
      name: "ECDSAInvalidSignatureLength",
      inputs: [{ name: "length", type: "uint256", internalType: "uint256" }],
    },
    {
      type: "error",
      name: "ECDSAInvalidSignatureS",
      inputs: [{ name: "s", type: "bytes32", internalType: "bytes32" }],
    },
    {
      type: "error",
      name: "ERC20ExceededSafeSupply",
      inputs: [
        { name: "increasedSupply", type: "uint256", internalType: "uint256" },
        { name: "cap", type: "uint256", internalType: "uint256" },
      ],
    },
    {
      type: "error",
      name: "ERC20InsufficientAllowance",
      inputs: [
        { name: "spender", type: "address", internalType: "address" },
        { name: "allowance", type: "uint256", internalType: "uint256" },
        { name: "needed", type: "uint256", internalType: "uint256" },
      ],
    },
    {
      type: "error",
      name: "ERC20InsufficientBalance",
      inputs: [
        { name: "sender", type: "address", internalType: "address" },
        { name: "balance", type: "uint256", internalType: "uint256" },
        { name: "needed", type: "uint256", internalType: "uint256" },
      ],
    },
    {
      type: "error",
      name: "ERC20InvalidApprover",
      inputs: [{ name: "approver", type: "address", internalType: "address" }],
    },
    {
      type: "error",
      name: "ERC20InvalidReceiver",
      inputs: [{ name: "receiver", type: "address", internalType: "address" }],
    },
    {
      type: "error",
      name: "ERC20InvalidSender",
      inputs: [{ name: "sender", type: "address", internalType: "address" }],
    },
    {
      type: "error",
      name: "ERC20InvalidSpender",
      inputs: [{ name: "spender", type: "address", internalType: "address" }],
    },
    {
      type: "error",
      name: "ERC5805FutureLookup",
      inputs: [
        { name: "timepoint", type: "uint256", internalType: "uint256" },
        { name: "clock", type: "uint48", internalType: "uint48" },
      ],
    },
    { type: "error", name: "ERC6372InconsistentClock", inputs: [] },
    { type: "error", name: "FailedInnerCall", inputs: [] },
    {
      type: "error",
      name: "InvalidAccountNonce",
      inputs: [
        { name: "account", type: "address", internalType: "address" },
        { name: "currentNonce", type: "uint256", internalType: "uint256" },
      ],
    },
    { type: "error", name: "InvalidInitialization", inputs: [] },
    {
      type: "error",
      name: "InvalidTokenOrdering",
      inputs: [
        {
          name: "tokens",
          type: "address[]",
          internalType: "contract IERC20[]",
        },
      ],
    },
    {
      type: "error",
      name: "MajorityRejected",
      inputs: [
        { name: "proposalId", type: "uint256", internalType: "uint256" },
        { name: "approvals", type: "uint256", internalType: "uint256" },
        { name: "rejections", type: "uint256", internalType: "uint256" },
      ],
    },
    {
      type: "error",
      name: "NativeTransferFailed",
      inputs: [
        { name: "to", type: "address", internalType: "address" },
        { name: "amount", type: "uint256", internalType: "uint256" },
      ],
    },
    {
      type: "error",
      name: "NoVotingPower",
      inputs: [
        { name: "blockNumber", type: "uint256", internalType: "uint256" },
        { name: "account", type: "address", internalType: "address" },
      ],
    },
    { type: "error", name: "NotInitializing", inputs: [] },
    {
      type: "error",
      name: "ProposalExecutionFailed",
      inputs: [
        { name: "proposalId", type: "uint256", internalType: "uint256" },
        { name: "action", type: "bytes", internalType: "bytes" },
        { name: "returnData", type: "bytes", internalType: "bytes" },
      ],
    },
    {
      type: "error",
      name: "SafeCastOverflowedUintDowncast",
      inputs: [
        { name: "bits", type: "uint8", internalType: "uint8" },
        { name: "value", type: "uint256", internalType: "uint256" },
      ],
    },
    {
      type: "error",
      name: "SafeERC20FailedOperation",
      inputs: [{ name: "token", type: "address", internalType: "address" }],
    },
    { type: "error", name: "VoteNone", inputs: [] },
    {
      type: "error",
      name: "VotesExpiredSignature",
      inputs: [{ name: "expiry", type: "uint256", internalType: "uint256" }],
    },
  ],
} as const
