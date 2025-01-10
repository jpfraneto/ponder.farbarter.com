import { createConfig } from "ponder";
import { http } from "viem";

import { FarbarterAbi } from "./abis/FarbarterAbi";

export default createConfig({
  networks: {
    base: {
      chainId: 8453,
      transport: http(process.env.PONDER_RPC_URL_8453),
    },
  },
  contracts: {
    Farbarter: {
      abi: FarbarterAbi,
      address: "0xbAeCa7e569eFea6e020014EAb898373407bBe826",
      network: "base",
      startBlock: 24865771,
    },
  },
});
