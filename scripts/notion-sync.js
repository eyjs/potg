/**
 * Notion WBS 자동 동기화 스크립트
 * HTTP 직접 호출 방식
 */

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const WBS_DB_ID = process.env.NOTION_WBS_DB_ID;
const COMMIT_MESSAGE = process.env.COMMIT_MESSAGE || '';
const COMMIT_URL = process.env.COMMIT_URL || '';

const NOTION_API = 'https://api.notion.com/v1';
const HEADERS = {
  'Authorization': `Bearer ${NOTION_TOKEN}`,
  'Content-Type': 'application/json',
  'Notion-Version': '2022-06-28'
};

function parseWbsIds(message) {
  const pattern = /\[WBS-(\d+)\]/gi;
  const matches = [...message.matchAll(pattern)];
  return matches.map(m => `WBS-${m[1].padStart(3, '0')}`);
}

function isCompleted(message) {
  return /\[완료\]|완료:|done|complete/i.test(message);
}

async function findWbsPage(taskId) {
  try {
    console.log(`🔎 ${taskId} 검색 중...`);
    
    const response = await fetch(`${NOTION_API}/databases/${WBS_DB_ID}/query`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        filter: {
          property: '태스크ID',
          title: { equals: taskId }
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error(`API 에러: ${error.message}`);
      return null;
    }

    const data = await response.json();
    console.log(`🔎 검색 결과: ${data.results.length}건`);
    return data.results[0] || null;
  } catch (error) {
    console.error(`Error finding ${taskId}:`, error.message);
    return null;
  }
}

async function updateWbsPage(pageId, status, commitUrl) {
  const today = new Date().toISOString().split('T')[0];
  
  const properties = {
    '상태': { select: { name: status } }
  };

  if (commitUrl) {
    properties['커밋링크'] = { url: commitUrl };
  }

  if (status === '완료') {
    properties['완료일'] = { date: { start: today } };
  }

  try {
    const response = await fetch(`${NOTION_API}/pages/${pageId}`, {
      method: 'PATCH',
      headers: HEADERS,
      body: JSON.stringify({ properties })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error(`Update 에러: ${error.message}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Error updating ${pageId}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Notion WBS 동기화 시작...');
  console.log(`📝 커밋: ${COMMIT_MESSAGE}`);
  
  if (!NOTION_TOKEN || !WBS_DB_ID) {
    console.error('❌ 환경변수 누락');
    process.exit(1);
  }

  // DB 연결 테스트
  try {
    const response = await fetch(`${NOTION_API}/databases/${WBS_DB_ID}`, {
      headers: HEADERS
    });
    
    if (!response.ok) {
      throw new Error('DB 연결 실패');
    }
    
    const db = await response.json();
    console.log(`✅ DB 연결 성공: ${db.title[0]?.plain_text || 'Untitled'}`);
  } catch (error) {
    console.error('❌ DB 연결 실패:', error.message);
    process.exit(1);
  }

  const wbsIds = parseWbsIds(COMMIT_MESSAGE);
  
  if (wbsIds.length === 0) {
    console.log('ℹ️ WBS ID 없음. 스킵.');
    return;
  }

  console.log(`🔍 WBS: ${wbsIds.join(', ')}`);

  const status = isCompleted(COMMIT_MESSAGE) ? '완료' : '진행중';
  console.log(`📊 상태: ${status}`);

  for (const taskId of wbsIds) {
    console.log(`\n🔄 ${taskId} 처리 중...`);
    const page = await findWbsPage(taskId);
    if (!page) {
      console.log(`⚠️ ${taskId} 못 찾음`);
      continue;
    }

    console.log(`📄 페이지 ID: ${page.id}`);
    const success = await updateWbsPage(page.id, status, COMMIT_URL);
    console.log(success ? `✅ ${taskId} → ${status}` : `❌ ${taskId} 실패`);
  }

  console.log('\n🎉 완료!');
}

main().catch(err => {
  console.error('❌ 스크립트 에러:', err);
  process.exit(1);
});
