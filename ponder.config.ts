import { createConfig } from "ponder";
import { http } from "viem";

import { FarbarterAbi } from "./abis/FarbarterAbi";

export default createConfig({
  networks: {
    degen: {
      chainId: 666666666,
      transport: http(process.env.PONDER_RPC_URL_666666666),
    },
  },
  contracts: {
    Farbarter: {
      abi: FarbarterAbi,
      address: "0x8D59e8Ef33FB819979Ad09Fb444A26792970fb6f",
      network: "degen",
      startBlock: 25172790,
    },
  },
});
