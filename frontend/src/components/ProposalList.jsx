import styles from "@/styles/app.module.css";

export default function ProposalList({ finalizedProposals }) {
  return (
    <div className="card mb-4">
      <div className="card-header">
        <h4>📋 Previous Proposals ({finalizedProposals.length})</h4>
      </div>
      <div className="card-body">
        {finalizedProposals.length === 0 ? (
          <p className="text-muted">No previous proposals.</p>
        ) : (
          <div className="list-group list-group-flush">
            {finalizedProposals
              .slice()
              .reverse()
              .map(([id, proposal]) => (
              <div key={id} className={`list-group-item ${styles.proposalItem}`}>
                <div className="d-flex justify-content-between align-items-start">
                  <strong>Proposal #{id}</strong>
                  <span className={`badge fs-6 px-3 py-2 ${
                    proposal.proposal_result === 'Approved' 
                      ? 'bg-success' 
                      : 'bg-danger'
                  }`}>
                    {proposal.proposal_result}
                  </span>
                </div>
                <p className="mb-1" style={{ whiteSpace: 'pre-wrap' }}>
                  {proposal.proposal_text}
                </p>
                <div className="mt-2">
                  <strong>AI Reasoning:</strong>
                  <p className="mb-1 text-muted" style={{ whiteSpace: 'pre-wrap' }}>
                    {proposal.reasoning}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
