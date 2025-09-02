import '@/styles/globals.css';

import '@near-wallet-selector/modal-ui/styles.css';
import { setupMeteorWallet } from '@near-wallet-selector/meteor-wallet';
import { GuestbookNearContract, NetworkId } from '@/config';
import { WalletSelectorProvider } from '@near-wallet-selector/react-hook';
import { Navigation } from '@/components/Navigation';

 
const walletSelectorConfig = {
  network: NetworkId,
  createAccessKeyFor: GuestbookNearContract,
  modules: [
    setupMeteorWallet(),
  ],
}

export default function App({ Component, pageProps }) {

  return (
    <WalletSelectorProvider config={walletSelectorConfig}>
      <Navigation />
      <Component {...pageProps} />
    </WalletSelectorProvider>
  );
}