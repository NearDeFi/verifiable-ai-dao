import '@/styles/globals.css';
import '@near-wallet-selector/modal-ui/styles.css';

import { setupMeteorWallet } from '@near-wallet-selector/meteor-wallet';
import { WalletSelectorProvider } from '@near-wallet-selector/react-hook';
import { ContractId } from '@/config';

const walletSelectorConfig = {
  network: {
    networkId: "testnet",
    nodeUrl: "https://rpc.testnet.fastnear.com",
  },
  // Problems here
  // createAccessKeyFor: {
  //   contractId: DaoContract,
  //   methodNames: [
  //     "create_proposal",
  //   ]
  // },
  modules: [
    setupMeteorWallet(),
  ],
}

export default function App({ Component, pageProps }) {

  return (
    <WalletSelectorProvider config={walletSelectorConfig}>
      <Component {...pageProps} />
    </WalletSelectorProvider>
  );
}