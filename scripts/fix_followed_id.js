import fs from 'fs';
import path from 'path';

const dir = './src/components/community';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

files.forEach(f => {
  const filePath = path.join(dir, f);
  const content = fs.readFileSync(filePath, 'utf-8');
  const newContent = content.replace(/followed_id/g, 'following_id');
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent);
    console.log(`Updated ${f}`);
  }
});
