const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const db = new Database('novel.db');

const rows = db.prepare('SELECT tid FROM novels').all();
const dbTids = new Set(rows.map(r => String(r.tid)));

const downloadsPath = path.join(__dirname, 'downloads');
const folderTids = new Set(
    fs.readdirSync(downloadsPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)
);

const onlyInDb = [...dbTids].filter(tid => !folderTids.has(tid));

const onlyInFolder = [...folderTids].filter(tid => !dbTids.has(tid));

console.log('只在数据库中的 tid:', onlyInDb);
console.log('只在文件夹中的 tid:', onlyInFolder);
