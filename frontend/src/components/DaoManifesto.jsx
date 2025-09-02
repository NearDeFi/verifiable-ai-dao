export default function DaoManifesto({ manifesto }) {
  if (!manifesto) {
    return (
      <div className="card mb-4">
        <div className="card-header">
          <h3>📜 DAO Manifesto</h3>
        </div>
        <div className="card-body">
          <p className="text-muted">No manifesto has been set yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card mb-4">
      <div className="card-header">
        <h3>📜 DAO Manifesto</h3>
      </div>
      <div className="card-body">
        <div className="bg-light p-3 rounded">
          <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{manifesto}</p>
        </div>
      </div>
    </div>
  );
}
