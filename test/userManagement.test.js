import test from 'node:test';
import assert from 'node:assert/strict';

// Helper representing the exact frontend initials and display logic
function computeUserDisplay(u) {
  const displayName =
    u.displayName ||
    u.fullName ||
    u.username ||
    (u.email ? u.email.split('@')[0] : 'User');

  const initials =
    (u.displayName
      ? u.displayName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : '') ||
    (u.username ?? u.email ?? 'U').slice(0, 2).toUpperCase() ||
    'U';

  const userIdentifier = u.username ? `@${u.username}` : (u.email ? u.email : '');
  const userIdBadge = u.userId || (u.id ? `ID-${u.id}` : (u._id ? `ID-${String(u._id).slice(-6).toUpperCase()}` : '—'));
  const status = u.status || 'Active';
  const role = u.role || 'Staff';

  return { displayName, initials, userIdentifier, userIdBadge, status, role };
}

// Helper representing the backend mapping logic
function formatUserRecord(u) {
  const username =
    u.username ||
    (u.email ? u.email.split('@')[0] : '') ||
    (u.userId ? u.userId.toLowerCase() : '') ||
    `user_${(u._id || '').toString().slice(-6)}`;
  const displayName =
    u.displayName ||
    u.fullName ||
    username ||
    (u.email ? u.email.split('@')[0] : 'User');
  const id = u.id || u._id;
  const userId =
    u.userId ||
    (u.id
      ? `USR-${u.id}`
      : u._id
        ? `USR-${u._id.toString().slice(-6).toUpperCase()}`
        : 'USR-0');

  return {
    ...u,
    id,
    userId,
    username,
    displayName,
    status: u.status || 'Active',
    department: u.department || 'General',
    createdByName: u.createdByName || 'System',
  };
}

test('User with all expected fields renders initials and display properties correctly', () => {
  const user = {
    id: 1,
    _id: '6aad143b871c969381600115',
    userId: 'USR-SA-01',
    username: 'labeeb.eee',
    displayName: 'Labeeb EEE',
    email: 'labeeb@curemaso.com',
    role: 'Super Admin',
    status: 'Active',
    department: 'Executive Administration',
  };

  const display = computeUserDisplay(user);
  assert.equal(display.initials, 'LE');
  assert.equal(display.displayName, 'Labeeb EEE');
  assert.equal(display.userIdentifier, '@labeeb.eee');
  assert.equal(display.userIdBadge, 'USR-SA-01');
  assert.equal(display.status, 'Active');
  assert.equal(display.role, 'Super Admin');
});

test('User with missing optional fields (no username, no displayName) does NOT throw .slice error', () => {
  const userWithoutNames = {
    _id: '6ac8cc825dbf2782d30aebed',
    email: 'recruiter_7151@example.com',
    fullName: 'Recruiter Test 7151',
    role: 'recruiter',
  };

  // Must not throw TypeError: Cannot read properties of undefined (reading 'slice')
  assert.doesNotThrow(() => {
    const display = computeUserDisplay(userWithoutNames);
    assert.equal(display.initials, 'RE');
    assert.equal(display.displayName, 'Recruiter Test 7151');
    assert.equal(display.userIdentifier, 'recruiter_7151@example.com');
    assert.equal(display.userIdBadge, 'ID-0AEBED');
    assert.equal(display.status, 'Active');
    assert.equal(display.role, 'recruiter');
  });
});

test('User with null optional fields does NOT throw error and uses fallbacks', () => {
  const userWithNulls = {
    _id: '6ad1c55cf01d4bad335bc525',
    username: null,
    displayName: null,
    fullName: null,
    email: 'candidate@letgetin.com',
    role: 'user',
    status: null,
  };

  assert.doesNotThrow(() => {
    const display = computeUserDisplay(userWithNulls);
    assert.equal(display.initials, 'CA');
    assert.equal(display.displayName, 'candidate');
    assert.equal(display.userIdentifier, 'candidate@letgetin.com');
    assert.equal(display.status, 'Active');
    assert.equal(display.role, 'user');
  });
});

test('User with empty displayName falls back cleanly to username slice', () => {
  const user = {
    id: 10,
    username: 'aarav.sharma',
    displayName: '',
    email: 'aarav@example.com',
    role: 'user',
  };

  const display = computeUserDisplay(user);
  assert.equal(display.initials, 'AA');
  assert.equal(display.displayName, 'aarav.sharma');
  assert.equal(display.userIdentifier, '@aarav.sharma');
});

test('User completely lacking displayName, username, and email falls back to U', () => {
  const minimalUser = {
    _id: '6ad1c55cf01d4bad335bc999',
    role: 'Staff',
  };

  const display = computeUserDisplay(minimalUser);
  assert.equal(display.initials, 'U');
  assert.equal(display.displayName, 'User');
  assert.equal(display.userIdBadge, 'ID-5BC999');
});

test('Empty user list renders empty collection without throwing', () => {
  const emptyList = [];
  const rendered = emptyList.map(computeUserDisplay);
  assert.equal(rendered.length, 0);
});

test('Backend formatUserRecord maps raw MongoDB documents to expected UserAccount structure', () => {
  const rawDoc = {
    _id: '6ad1c76c2cb959d27edc718d',
    email: 'founder.1792132972356@nexustech.io',
    fullName: 'David Founder',
    role: 'recruiter',
  };

  const formatted = formatUserRecord(rawDoc);
  assert.equal(formatted.id, '6ad1c76c2cb959d27edc718d');
  assert.equal(formatted.username, 'founder.1792132972356');
  assert.equal(formatted.displayName, 'David Founder');
  assert.equal(formatted.status, 'Active');
  assert.equal(formatted.department, 'General');
  assert.equal(formatted.userId, 'USR-DC718D');
  assert.equal(formatted.createdByName, 'System');

  // Frontend rendering of formatted record
  const display = computeUserDisplay(formatted);
  assert.equal(display.initials, 'DF');
  assert.equal(display.displayName, 'David Founder');
  assert.equal(display.userIdentifier, '@founder.1792132972356');
});
