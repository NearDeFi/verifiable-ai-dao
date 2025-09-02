import { useState, useEffect } from "react";

import styles from "@/styles/app.module.css";

import { useWalletSelector } from '@near-wallet-selector/react-hook';


export default function Home() {
  const { signedAccountId, viewFunction, callFunction } = useWalletSelector();


  return (
    <main className={styles.main}>
      <h1>Hello World</h1>
    </main>
  );
}
