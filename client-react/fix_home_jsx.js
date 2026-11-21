const fs = require('fs');
const path = require('path');

const filePath = path.join('client-react', 'src', 'pages', 'Home.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const searchString = '<div className="upload-interactive-section" style={{ marginTop: \'2.5rem\', display: \'flex\', flexDirection: \'column\', alignItems: \'center\', gap: \'1.5rem\' }}>';
const replacementString = `                <div className="upload-interactive-section" style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                  <div className="delivery-toggle-wrap" style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '1rem',
                    padding: '0.75rem 1.5rem',
                    background: 'white',
                    borderRadius: '2rem',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                    border: '1px solid #eee',
                    marginBottom: '0.5rem'
                  }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: '500', color: '#666' }}>Classroom Delivery:</span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className={\`btn btn-sm \${!classroomDelivery ? 'btn-primary' : 'btn-outline'}\`}
                        onClick={() => setClassroomDelivery(false)}
                        style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem' }}
                      >
                        No (Free)
                      </button>
                      <button
                        className={\`btn btn-sm \${classroomDelivery ? 'btn-primary' : 'btn-outline'}\`}
                        onClick={() => setClassroomDelivery(true)}
                        style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem' }}
                      >
                        Yes (+₹10)
                      </button>
                    </div>
                  </div>`;

if (content.includes(searchString)) {
    content = content.replace(searchString, replacementString);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully updated Home.jsx');
} else {
    console.error('Could not find the search string in Home.jsx');
    process.exit(1);
}
