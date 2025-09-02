import '@/styles/globals.css';
import '@near-wallet-selector/modal-ui/styles.css';

import { setupMeteorWallet } from '@near-wallet-selector/meteor-wallet';
import { WalletSelectorProvider } from '@near-wallet-selector/react-hook';
import { DaoContract, NetworkId } from '@/config';

const walletSelectorConfig = {
  network: NetworkId,
  createAccessKeyFor: {
    contractId: DaoContract,
    methodNames: [
      "create_proposal",
    ]
  },
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