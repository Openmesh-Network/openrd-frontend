export const CrowdfundedTasksManagerFactoryContract = {
  address: "0xF74d3037F0aF80df6EF7edE3EE671B3c556fa43a",
  abi: [
    { type: "constructor", inputs: [], stateMutability: "nonpayable" },
    {
      type: "function",
      name: "deploy",
      inputs: [
        { name: "_salt", type: "bytes32", internalType: "bytes32" },
        { name: "_metadata", type: "string", internalType: "string" },
        { name: "_deadline", type: "uint64", internalType: "uint64" },
        { name: "_disputeManager", type: "address", internalType: "address" },
        { name: "_nativeRate", type: "uint208", internalType: "uint208" },
        { name: "_executionDelay", type: "uint48", internalType: "uint48" },
        {
          name: "_budgetTokens",
          type: "tuple[]",
          internalType: "struct CrowdfundedTasksManager.BudgetToken[]",
          components: [
            {
              name: "tokenContract",
              type: "address",
              internalType: "contract IERC20",
            },
            { name: "rate", type: "uint96", internalType: "uint96" },
          ],
        },
        {
          name: "_preapprove",
          type: "tuple[]",
          internalType: "struct ITasks.PreapprovedApplication[]",
          components: [
            { name: "applicant", type: "address", internalType: "address" },
            {
              name: "nativeReward",
              type: "tuple[]",
              internalType: "struct ITasks.NativeReward[]",
              components: [
                { name: "to", type: "address", internalType: "address" },
                { name: "amount", type: "uint96", internalType: "uint96" },
              ],
            },
            {
              name: "reward",
              type: "tuple[]",
              internalType: "struct ITasks.Reward[]",
              components: [
                { name: "nextToken", type: "bool", internalType: "bool" },
                { name: "to", type: "address", internalType: "address" },
                { name: "amount", type: "uint88", internalType: "uint88" },
              ],
            },
          ],
        },
      ],
      outputs: [
        {
          name: "proxy",
          type: "address",
          internalType: "contract CrowdfundedTasksManagerProxy",
        },
      ],
      stateMutability: "nonpayable",
    },
    {
      type: "function",
      name: "implementation",
      inputs: [],
      outputs: [
        {
          name: "",
          type: "address",
          internalType: "contract CrowdfundedTasksManagerProxy",
        },
      ],
      stateMutability: "view",
    },
    {
      type: "event",
      name: "CrowdfundedTaskManagerDeployed",
      inputs: [
        {
          name: "crowdfundedTaskManager",
          type: "address",
          indexed: true,
          internalType: "contract CrowdfundedTasksManagerProxy",
        },
      ],
      anonymous: false,
    },
    { type: "error", name: "ERC1167FailedCreateClone", inputs: [] },
  ],
} as const;
