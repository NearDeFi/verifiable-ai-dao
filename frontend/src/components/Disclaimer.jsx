import React from 'react';

const Disclaimer = () => {
  return (
    <div className="alert alert-warning py-2" role="alert" style={{ fontSize: '0.85rem' }}>
      <h6 className="alert-heading mb-1">Disclosure & Disclaimer</h6>
      <ul className="mb-1" style={{ fontSize: '0.8rem' }}>
        <li>This is a testnet demo only.</li>
        <li>All proposals and responses are simulated and public.</li>
        <li>Do not include personal, financial, or confidential information.</li>
        <li>AI responses are automated and may be wrong.</li>
        <li>Nothing here is financial, legal, or governance advice.</li>
      </ul>
      <p className="mb-0" style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>
        <a href="https://fringe-brow-647.notion.site/AI-DAO-Terms-26809959836d8033a273f58fd1abe062?source=copy_link" style={{ color: 'inherit', textDecoration: 'underline' }}>
          Full terms of use
        </a>
      </p>
    </div>
  );
};

export default Disclaimer;
