// Instant skeleton shown while a section page renders — turns a blank wait into
// immediate feedback on category navigation.
export default function Loading() {
  return (
    <>
      <div className="wrap dept" style={{ textAlign: 'center' }}>
        <div className="sk" style={{ height: 12, width: 120, margin: '0 auto' }} />
        <div className="sk" style={{ height: 56, width: '38%', margin: '18px auto 0' }} />
        <div className="sk" style={{ height: 16, width: '56%', margin: '20px auto 0' }} />
      </div>
      <div className="wrap">
        <div className="feature">
          <div className="sk" style={{ aspectRatio: '4 / 3' }} />
          <div>
            <div className="sk" style={{ height: 12, width: 100 }} />
            <div className="sk" style={{ height: 42, width: '92%', marginTop: 14 }} />
            <div className="sk" style={{ height: 16, width: '70%', marginTop: 16 }} />
            <div className="sk" style={{ height: 12, width: 140, marginTop: 18 }} />
          </div>
        </div>
      </div>
      <div className="wrap section">
        <div className="grid g3">
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <div className="sk" style={{ aspectRatio: '4 / 5' }} />
              <div className="sk" style={{ height: 12, width: 80, marginTop: 16 }} />
              <div className="sk" style={{ height: 22, width: '85%', marginTop: 10 }} />
              <div className="sk" style={{ height: 14, width: '95%', marginTop: 12 }} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
