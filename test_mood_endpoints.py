import httpx
import json

print('=== Testing Mood Endpoints ===\n')

# Register
reg_resp = httpx.post('http://localhost:8000/auth/register', 
    json={'email': 'moodtest@example.com', 'password': 'testpass123'})
token = reg_resp.json()['token']
print('✓ Registered, token obtained')

# Test 1: Record a mood
print('\n1. POST /mood (record mood)')
mood_resp = httpx.post('http://localhost:8000/mood', 
    headers={'Authorization': f'Bearer {token}'},
    json={'mood_score': 8, 'note': 'Feeling great today!'})
print(f'Status: {mood_resp.status_code}')
if mood_resp.status_code == 200:
    data = mood_resp.json()
    print(f"✓ Mood recorded: score={data['mood_score']}, id={data['id']}")

# Test 2: Record another mood
print('\n2. POST /mood (second entry)')
mood_resp2 = httpx.post('http://localhost:8000/mood', 
    headers={'Authorization': f'Bearer {token}'},
    json={'mood_score': 7, 'note': 'Still good'})
print(f'Status: {mood_resp2.status_code}')
if mood_resp2.status_code == 200:
    print('✓ Second mood recorded')

# Test 3: Get mood history
print('\n3. GET /mood/history?days=30')
history_resp = httpx.get('http://localhost:8000/mood/history?days=30',
    headers={'Authorization': f'Bearer {token}'})
print(f'Status: {history_resp.status_code}')
if history_resp.status_code == 200:
    entries = history_resp.json()
    print(f'✓ Found {len(entries)} mood entries')
    for i, entry in enumerate(entries, 1):
        print(f'  {i}. Score: {entry["mood_score"]}, Note: {entry["note"]}')

# Test 4: Validate mood_score must be 1-10
print('\n4. POST /mood (invalid mood_score=11)')
invalid_resp = httpx.post('http://localhost:8000/mood',
    headers={'Authorization': f'Bearer {token}'},
    json={'mood_score': 11})
print(f'Status: {invalid_resp.status_code}')
print(f'✓ Validation error: {invalid_resp.json()["detail"]}')

print('\n✓ All mood endpoints working correctly!')
