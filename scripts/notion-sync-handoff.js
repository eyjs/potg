/**
 * Notion 개발노트 자동 동기화
 * handoff.md 변경 시 개발노트 DB에 자동 추가
 */

const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DEVNOTE_DB_ID = process.env.NOTION_DEVNOTE_DB_ID;

const notion = new Client({ auth: NOTION_TOKEN });

function parseHandoff() {
  const handoffPath = path.join(process.cwd(), 'docs', 'handoff.md');
  
  if (!fs.existsSync(handoffPath)) {
    return null;
  }

  const content = fs.readFileSync(handoffPath, 'utf-8');
  const dateMatch = content.match(/마지막 업데이트:\s*(\d{4}-\d{2}-\d{2})/);
  const updateDate = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];

  const completedSection = content.match(/## 1\. 완료된 작업[\s\S]*?(?=##|$)/);
  const completedTasks = completedSection ? completedSection[0].trim() : '';

  return { date: updateDate, completedTasks };
}

async function findTodayNote(date) {
  try {
    const response = await notion.databases.query({
      database_id: DEVNOTE_DB_ID,
      filter: {
        property: '릴리즈일',
        date: { equals: date }
      }
    });
    return response.results[0] || null;
  } catch (error) {
    return null;
  }
}

async function createDevNote(data) {
  const version = `dev-${data.date.replace(/-/g, '')}`;

  try {
    return await notion.pages.create({
      parent: { database_id: DEVNOTE_DB_ID },
      properties: {
        '버전': { title: [{ text: { content: version } }] },
        '릴리즈일': { date: { start: data.date } },
        '유형': { multi_select: [{ name: '신규기능' }] },
        '변경사항': { rich_text: [{ text: { content: data.completedTasks.substring(0, 2000) } }] }
      }
    });
  } catch (error) {
    console.error('Error:', error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 개발노트 동기화 시작...');

  if (!NOTION_TOKEN || !DEVNOTE_DB_ID) {
    console.error('❌ 환경변수 누락');
    process.exit(1);
  }

  const data = parseHandoff();
  if (!data) {
    console.log('ℹ️ handoff.md 없음');
    return;
  }

  const existing = await findTodayNote(data.date);

  if (existing) {
    console.log('📝 기존 노트 있음, 스킵');
  } else {
    const note = await createDevNote(data);
    console.log(note ? `✅ 생성 완료: ${note.url}` : '❌ 생성 실패');
  }
}

main().catch(console.error);
