const { chromium } = require('playwright');
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs')
const axios = require('axios');
const iconv = require("iconv-lite");
const rawCookies = [
    {
        "domain": ".sdgvre54q.com",
        "expirationDate": 1757639386.46044,
        "hostOnly": false,
        "httpOnly": false,
        "name": "yj0M_eda4_lastact",
        "path": "/",
        "sameSite": null,
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "1757552987%09index.php%09"
    },
    {
        "domain": ".sdgvre54q.com",
        "expirationDate": 1758856508.207655,
        "hostOnly": false,
        "httpOnly": false,
        "name": "yj0M_eda4_lastvisit",
        "path": "/",
        "sameSite": null,
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "1756260907"
    },
    {
        "domain": ".sdgvre54q.com",
        "expirationDate": 1757553586,
        "hostOnly": false,
        "httpOnly": false,
        "name": "yj0M_eda4_noticeTitle",
        "path": "/",
        "sameSite": null,
        "secure": false,
        "session": false,
        "storeId": null,
        "value": "1"
    },
    {
        "domain": ".sdgvre54q.com",
        "expirationDate": 1758856508.207578,
        "hostOnly": false,
        "httpOnly": true,
        "name": "yj0M_eda4_saltkey",
        "path": "/",
        "sameSite": null,
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "G3L8G5u8"
    },
    {
        "domain": "3cbg9.sdgvre54q.com",
        "hostOnly": true,
        "httpOnly": false,
        "name": "PHPSESSID",
        "path": "/",
        "sameSite": null,
        "secure": false,
        "session": true,
        "storeId": null,
        "value": "88v9frmgvkautnpeheqphn7675"
    },
    {
        "domain": ".sdgvre54q.com",
        "hostOnly": false,
        "httpOnly": true,
        "name": "yj0M_eda4_auth",
        "path": "/",
        "sameSite": null,
        "secure": true,
        "session": true,
        "storeId": null,
        "value": "4ecbI%2Bd%2Bcbhcc70Pdz86HhNR6Qu%2BWvGZQMFpYhNfVxI7ZSFjn50ZjuXSGVR6FQXqU4%2FFjvdvyCpSXB56PqX7tkAhSvo"
    },
    {
        "domain": ".sdgvre54q.com",
        "expirationDate": 1757553012.240993,
        "hostOnly": false,
        "httpOnly": false,
        "name": "yj0M_eda4_checkfollow",
        "path": "/",
        "sameSite": null,
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "1"
    },
    {
        "domain": ".sdgvre54q.com",
        "expirationDate": 1789088982.240973,
        "hostOnly": false,
        "httpOnly": false,
        "name": "yj0M_eda4_lastcheckfeed",
        "path": "/",
        "sameSite": null,
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "679983%7C1757552983"
    },
    {
        "domain": ".sdgvre54q.com",
        "hostOnly": false,
        "httpOnly": false,
        "name": "yj0M_eda4_lip",
        "path": "/",
        "sameSite": null,
        "secure": true,
        "session": true,
        "storeId": null,
        "value": "185.148.13.178%2C1757552983"
    },
    {
        "domain": ".sdgvre54q.com",
        "expirationDate": 1789088986.460502,
        "hostOnly": false,
        "httpOnly": false,
        "name": "yj0M_eda4_nofavfid",
        "path": "/",
        "sameSite": null,
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "1"
    },
    {
        "domain": ".sdgvre54q.com",
        "expirationDate": 1757553268.773737,
        "hostOnly": false,
        "httpOnly": false,
        "name": "yj0M_eda4_sendmail",
        "path": "/",
        "sameSite": null,
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "1"
    },
    {
        "domain": ".sdgvre54q.com",
        "expirationDate": 1757639386.460293,
        "hostOnly": false,
        "httpOnly": false,
        "name": "yj0M_eda4_sid",
        "path": "/",
        "sameSite": null,
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "0"
    },
    {
        "domain": ".sdgvre54q.com",
        "expirationDate": 1789088982.240897,
        "hostOnly": false,
        "httpOnly": false,
        "name": "yj0M_eda4_ulastactivity",
        "path": "/",
        "sameSite": null,
        "secure": true,
        "session": false,
        "storeId": null,
        "value": "1757552983%7C0"
    }
]

const dbPath = './wanted.db';

const db = new Database(dbPath);

db.prepare(`
    CREATE TABLE IF NOT EXISTS novels (
        tid INTEGER PRIMARY KEY,
        title TEXT,
        content TEXT
    )
`).run();

let currentProxy = 0
let errorCount = 0

async function countError() {
    let useProxy = ""
    try {
        errorCount++
        if (errorCount == 10) {
            errorCount = 0
            useProxy = "direct"
        } else {
            currentProxy++
            currentProxy = currentProxy % 116
            useProxy = currentProxy.toString()
        }
        const url = `http://127.0.0.1:59999/proxies/selected`;

        const res = await axios.put(
            url,
            { name: useProxy },
            {
                headers: {
                    "Content-Type": "application/json",
                },
                validateStatus: () => true,
            }
        );

        if (res.status === 204) {
            console.log("proxy changed", useProxy);
        } else {
            console.error("change proxy error http", res.data);
        }
    } catch (err) {
        console.error("change proxy error:", err.message);
    }
}

(async () => {
    const domain = '3cbg9.sdgvre54q.com'
    const baseUrl = 'https://3cbg9.sdgvre54q.com/'
    const mobileTXTPath = 'forum.php?mod=forumdisplay&fid=100&page=21'
    const savePath = './wanted-downloads'

    const browser = await chromium.launch({
        headless: true,
        proxy: {
            server: "http://127.0.0.1:60000"
        }
    });
    const context = await browser.newContext({
        ignoreHTTPSErrors: true
    });
    const cookies = rawCookies.map(c => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path || '/',
        httpOnly: c.httpOnly || false,
        secure: c.secure || false,
        expires: c.expirationDate ? Math.floor(c.expirationDate) : undefined,
    }));
    const blankPage = await context.newPage();

    await context.addCookies(cookies);
    let page = await context.newPage();

    while (true) {
        try {
            await page.goto(baseUrl + mobileTXTPath, { waitUntil: 'domcontentloaded', timeout: 20000 });
        } catch (err) {
            countError()
            console.log(err)
            await page.close()
            page = await context.newPage();
            continue
        }
        break
    }


    while (true) {
        const threadList = page.locator('table#threadlisttableid tbody');
        const count = await threadList.count();

        for (let i = 0; i < count; i++) {
            const id = await threadList.nth(i).getAttribute('id');
            if (id != null) {
                if (id.includes("normalthread") && threadText.includes("[已解决]")) {
                    const link = threadList.nth(i).locator('a.s.xst').first();
                    const href = await link.getAttribute('href');

                    if (href.includes('tid=adver')) {
                        console.log('adver')
                        continue;
                    }

                    const parsedUrl = new URL(baseUrl + href);
                    const tid = parsedUrl.searchParams.get('tid');

                    const row = db.prepare('SELECT tid FROM novels WHERE tid = ?').get(tid);

                    if (row != undefined) {
                        console.log(tid + '-added')
                        continue;
                    }

                    const threadPage = await context.newPage();
                    try {
                        await threadPage.goto(baseUrl + href, { waitUntil: 'domcontentloaded', timeout: 20000 });
                    } catch (err) {
                        countError()
                        console.log(err)
                        await threadPage.close()
                        i--
                        continue
                    }


                    const fullPageContent = await threadPage.content();

                    if (fullPageContent.includes('您浏览的太快了，歇一会儿吧！')) {
                        console.warn("too fast");
                        countError()
                        await threadPage.close()
                        i--;
                        continue;
                    } else if (fullPageContent.includes('没有找到帖子')) {
                        console.warn("no topic");
                        await threadPage.close()
                        continue;
                    } else if (fullPageContent.includes('Database Error')) {
                        console.warn("db error");
                        await threadPage.close()
                        i--;
                        continue;
                    }

                    let title = ''

                    try {
                        let titleElement = threadPage.locator('span#thread_subject').first();
                        title = await titleElement.textContent();
                        console.log(title)
                    } catch (err) {
                        countError()
                        console.log(err)
                        await threadPage.close()
                        i--
                        continue
                    }


                    const aList = threadPage.locator('div.pcb').nth(1).locator('a');
                    const count = await aList.count();
                    let fileCount = 0

                    if (count != 0) {
                        for (let i = 0; i < count; i++) {
                            const href = await aList.nth(i).getAttribute('href')
                            if (href != null) {
                                if (href.startsWith('forum.php?mod=attachment&aid=')) {
                                    downloadLink = baseUrl + href;

                                    var response
                                    while (true) {
                                        try {
                                            response = await threadPage.request.get(downloadLink, { timeout: 2000000 });
                                        } catch (err) {
                                            countError()
                                            console.log(err)
                                            continue
                                        }
                                        break
                                    }


                                    const contentType = response.headers()['content-type'];
                                    const contentDisposition = response.headers()['content-disposition'];
                                    let filename = '';
                                    const buffer = await response.body();

                                    const htmlStr = iconv.decode(buffer, "gb2312");
                                    if (contentDisposition) {
                                        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
                                        if (filenameMatch && filenameMatch[1]) {
                                            filename = filenameMatch[1];
                                        }
                                    } else {
                                        if (htmlStr.includes('Discuz! System Error')) {
                                            break
                                        } else if (htmlStr.includes('您浏览的太快了，歇一会儿吧！')) {
                                            console.log('too fast')
                                            countError()
                                        } else if (htmlStr.includes('抱歉，只有特定用户可以下载本站附件')) {
                                            console.log('only unique')
                                            continue
                                        }
                                        i--
                                        continue
                                    }

                                    filename = filename.replace(/[\\/:*?"<>|]/g, "_");

                                    const targetDir = savePath + '/' + tid
                                    fs.mkdirSync(targetDir, { recursive: true });

                                    // const buffer = await response.body();

                                    const filePath = path.resolve(targetDir, filename);
                                    fs.writeFileSync(filePath, buffer);
                                    fileCount++
                                }
                            }
                        }
                    }

                    if (fileCount != 0) {
                        try {
                            const stmt = db.prepare(`INSERT INTO novels (tid, title, content) VALUES (?, ?, ?)`);
                            stmt.run(tid, title, '');
                        } catch (err) {
                            countError()
                            console.error(err);
                        }
                    }

                    await threadPage.close()
                }
            }
        }

        const nextElements = page.locator('a.nxt');
        if (nextElements.count() == 0) {
            console.log('pass')
            break
        } else {
            const nextPath = await nextElements.first().getAttribute('href')
            var contentStr = ''
            if (nextPath != null) {
                while (true) {
                    try {
                        await page.goto(baseUrl + nextPath, { waitUntil: 'domcontentloaded', timeout: 20000 })
                        try {
                            fs.writeFileSync('currentPage.txt', nextPath, 'utf8');
                        } catch (err) {
                            console.error('save current page error:', err);
                        }
                        contentStr = await page.content();
                    } catch (err) {
                        countError()
                        console.log(err)
                        await page.close()
                        page = await context.newPage();
                        continue
                    }
                    if (contentStr.includes('Database Error')) {
                        continue
                    }
                    break
                }
                console.log(baseUrl + nextPath)
            }
        }
    }

    db.close();
    await browser.close();
})();
